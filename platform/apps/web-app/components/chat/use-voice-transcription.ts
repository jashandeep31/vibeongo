"use client";

import {
  createVoiceWav,
  MAX_VOICE_SECONDS,
  startVoiceAudioCapture,
  VOICE_SAMPLE_RATE,
  type VoiceAudioCapture,
} from "@/lib/voice-audio-capture";
import {
  openVoiceStreamingSession,
  type VoiceStreamingSession,
} from "@repo/api-client";
import { useApiClient } from "@repo/api-hooks";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type VoiceState =
  "idle" | "starting" | "recording" | "stopping" | "transcribing" | "error";
type Recording = {
  abort: AbortController;
  baseText: string;
  chunks: Uint8Array[];
  queue: Uint8Array[];
  samples: number;
  seconds: number;
  capture?: VoiceAudioCapture;
  session?: VoiceStreamingSession;
  connect?: Promise<void>;
  ready: boolean;
  authorized: boolean;
  streamingFailed: boolean;
  timer?: ReturnType<typeof setTimeout>;
  limitTimer?: ReturnType<typeof setTimeout>;
  drained?: () => void;
  wav?: Blob;
};

function errorMessage(error: unknown) {
  const response = (
    error as {
      response?: { data?: { message?: unknown }; status?: number };
    } | null
  )?.response;
  if (typeof response?.data?.message === "string") return response.data.message;
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError")
      return "Microphone permission was denied. Allow microphone access in your browser and try again.";
    if (error.name === "NotFoundError")
      return "No microphone was found. Connect a microphone and try again.";
    if (error.name === "NotReadableError")
      return "Your microphone is unavailable. Check whether another app is using it.";
  }
  return error instanceof Error
    ? error.message
    : "Could not transcribe recording. Retry or discard it.";
}
function accessDenied(error: unknown) {
  const status = (error as { response?: { status?: number } } | null)?.response
    ?.status;
  return (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    errorMessage(error).toLowerCase().includes("insufficient balance")
  );
}
function reportError(error: unknown, onWallet: () => void) {
  const message = errorMessage(error);
  toast.error(
    message,
    message.toLowerCase().includes("insufficient balance")
      ? {
          action: {
            label: "Open wallet",
            onClick: onWallet,
          },
        }
      : undefined,
  );
}
function release(recording: Recording) {
  recording.abort.abort();
  recording.capture?.cancel();
  recording.session?.close();
  clearTimeout(recording.timer);
  clearTimeout(recording.limitTimer);
  recording.drained?.();
  recording.drained = undefined;
  recording.queue = [];
  recording.chunks = [];
  recording.wav = undefined;
}

export function useVoiceTranscription({
  getText,
  onChangeText,
  onDone,
}: {
  getText: () => string;
  onChangeText: (text: string) => void;
  onDone: () => void;
}) {
  const client = useApiClient();
  const router = useRouter();
  const [state, setState] = useState<VoiceState>("idle");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const stateRef = useRef<VoiceState>("idle");
  const recordingRef = useRef<Recording | null>(null);
  const meterRef = useRef(-160);
  // Remains available after unmount cleanup, irrespective of effect order.
  const draftTextRef = useRef<string | undefined>(undefined);
  const getDraftText = useCallback(() => draftTextRef.current, []);
  const callbacks = useRef({ getText, onChangeText, onDone });
  useEffect(() => {
    callbacks.current = { getText, onChangeText, onDone };
  }, [getText, onChangeText, onDone]);
  const changeState = (next: VoiceState) => {
    stateRef.current = next;
    setState(next);
  };
  const current = (recording: Recording) =>
    recordingRef.current === recording && !recording.abort.signal.aborted;
  const applyTranscript = (recording: Recording, transcript: string) => {
    if (!current(recording)) return;
    const text = transcript.trim();
    callbacks.current.onChangeText(
      text
        ? `${recording.baseText.trimEnd()}${recording.baseText.trim() ? " " : ""}${text}`
        : recording.baseText,
    );
  };
  const complete = (recording: Recording, transcript: string) => {
    if (!current(recording)) return;
    if (!transcript.trim())
      throw new Error("No speech detected. Try recording again.");
    applyTranscript(recording, transcript);
    draftTextRef.current = undefined;
    recordingRef.current = null;
    release(recording);
    changeState("idle");
    callbacks.current.onDone();
  };
  const cancel = () => {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    release(recording);
    callbacks.current.onChangeText(recording.baseText);
    draftTextRef.current = undefined;
    meterRef.current = -160;
    changeState("idle");
    callbacks.current.onDone();
  };
  const failStreaming = (recording: Recording) => {
    if (!current(recording) || recording.streamingFailed) return;
    recording.streamingFailed = true;
    recording.ready = false;
    recording.session?.close();
    clearTimeout(recording.timer);
    recording.timer = undefined;
    recording.queue = [];
    recording.drained?.();
    recording.drained = undefined;
    callbacks.current.onChangeText(recording.baseText);
  };
  // Drain at audio speed: replaying a connection backlog in one burst is
  // rejected by the streaming API. Bound backlog to five seconds.
  const drain = (recording: Recording) => {
    if (!current(recording) || !recording.ready || recording.timer) return;
    const chunk = recording.queue.shift();
    if (!chunk) {
      recording.drained?.();
      recording.drained = undefined;
      return;
    }
    recording.session?.send(chunk);
    if (recording.streamingFailed) return;
    recording.timer = setTimeout(
      () => {
        recording.timer = undefined;
        drain(recording);
      },
      (chunk.length / (VOICE_SAMPLE_RATE * 2)) * 1000,
    );
  };
  const transcribe = async (recording: Recording) => {
    if (!current(recording) || !recording.wav) return;
    changeState("transcribing");
    try {
      const text = await client.speechText.transcribeAudio(
        recording.wav,
        recording.abort.signal,
      );
      complete(recording, text);
    } catch (error) {
      if (!current(recording)) return;
      if (accessDenied(error)) cancel();
      else changeState("error");
      reportError(error, () => router.push("/wallet"));
    }
  };
  const stop = async () => {
    const recording = recordingRef.current;
    if (!recording || stateRef.current !== "recording") return;
    changeState("stopping");
    clearTimeout(recording.limitTimer);
    await recording.capture?.stop();
    if (!current(recording)) return;
    meterRef.current = -160;
    await recording.connect;
    if (!current(recording)) return;
    if (!recording.samples) {
      cancel();
      toast.error(
        "No audio was captured. Check your microphone and try again.",
      );
      return;
    }
    if (recording.ready && !recording.streamingFailed) {
      await new Promise<void>((resolve) => {
        recording.drained = resolve;
        drain(recording);
      });
      if (!current(recording)) return;
      try {
        if (recording.streamingFailed)
          throw new Error("Voice streaming failed");
        complete(recording, await recording.session!.finish(10_000));
        return;
      } catch {
        if (!current(recording)) return;
        failStreaming(recording);
      }
    }
    // A rejected token must never turn into an HTTP request bypassing limits.
    if (!recording.authorized) {
      cancel();
      return;
    }
    recording.wav = createVoiceWav(recording.chunks);
    recording.chunks = [];
    await transcribe(recording);
  };
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  });

  const start = async () => {
    if (stateRef.current !== "idle") return;
    const recording: Recording = {
      abort: new AbortController(),
      baseText: callbacks.current.getText(),
      chunks: [],
      queue: [],
      samples: 0,
      seconds: 0,
      ready: false,
      authorized: false,
      streamingFailed: false,
    };
    recordingRef.current = recording;
    draftTextRef.current = recording.baseText;
    meterRef.current = -160;
    setDurationSeconds(0);
    changeState("starting");
    // Acquire/resume from this gesture, in parallel with the authenticated token.
    const capturePromise = startVoiceAudioCapture({
      signal: recording.abort.signal,
      onChunk: (chunk, samples, peak) => {
        if (!current(recording)) return;
        recording.chunks.push(chunk);
        recording.samples = samples;
        meterRef.current = peak ? 20 * Math.log10(peak) : -160;
        const seconds = Math.min(
          MAX_VOICE_SECONDS,
          Math.floor(samples / VOICE_SAMPLE_RATE),
        );
        if (seconds !== recording.seconds) {
          recording.seconds = seconds;
          setDurationSeconds(seconds);
        }
        if (recording.streamingFailed) return;
        if (recording.queue.length >= 50) {
          failStreaming(recording);
          return;
        }
        // The last Worklet buffer can be shorter than the protocol's 50 ms.
        const finalChunk = chunk.length < 1600 ? new Uint8Array(1600) : chunk;
        if (finalChunk !== chunk) finalChunk.set(chunk);
        recording.queue.push(finalChunk);
        drain(recording);
      },
      onLimit: () => {
        void stopRef.current();
      },
      onInterrupted: () => {
        void stopRef.current();
      },
    });
    recording.connect = (async () => {
      try {
        const token = await client.speechText.createStreamingToken(
          recording.abort.signal,
        );
        if (!current(recording)) return;
        recording.authorized = true;
        // An ignored permission prompt must not start a billable socket session.
        await capturePromise;
        if (!current(recording)) return;
        if (recording.streamingFailed) return;
        recording.session = openVoiceStreamingSession({
          token,
          sampleRate: VOICE_SAMPLE_RATE,
          onClose: () => failStreaming(recording),
          onTranscript: (text) => applyTranscript(recording, text),
        });
        await recording.session.ready;
        if (!current(recording) || recording.streamingFailed) return;
        recording.ready = true;
        drain(recording);
      } catch (error) {
        if (!current(recording)) return;
        if (!recording.authorized || accessDenied(error)) {
          cancel();
          reportError(error, () => router.push("/wallet"));
        } else failStreaming(recording);
      }
    })();
    try {
      const capture = await capturePromise;
      if (!current(recording)) {
        capture.cancel();
        return;
      }
      recording.capture = capture;
      changeState("recording");
      recording.limitTimer = setTimeout(() => {
        void stopRef.current();
      }, MAX_VOICE_SECONDS * 1000);
    } catch (error) {
      if (!current(recording)) return;
      cancel();
      reportError(error, () => router.push("/wallet"));
    }
  };
  const retry = () => {
    const recording = recordingRef.current;
    if (recording && stateRef.current === "error") void transcribe(recording);
  };
  const cancelRef = useRef(cancel);
  useEffect(() => {
    cancelRef.current = cancel;
  });
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) return;
      if (stateRef.current === "starting") cancelRef.current();
      else void stopRef.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      const recording = recordingRef.current;
      recordingRef.current = null;
      if (recording) release(recording);
    };
  }, []);
  return {
    state,
    durationSeconds,
    meterRef,
    getDraftText,
    start,
    stop,
    cancel,
    retry,
    isActive: state !== "idle",
    // Synchronous guard also covers a click and submit within the same render.
    isBusy: () => stateRef.current !== "idle",
  };
}
