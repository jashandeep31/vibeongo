import { useApiClient } from "@repo/api-hooks";
import {
  type AudioStreamBuffer,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  useAudioStream,
} from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import Toast from "react-native-toast-message";

import {
  openVoiceStreamingSession,
  type VoiceStreamingSession,
} from "@/components/projects/voice-streaming-session";

type VoiceState =
  | "idle"
  | "starting"
  | "recording"
  | "stopping"
  | "transcribing"
  | "canceling"
  | "error";

const MAX_RECORDING_MS = 120_000;
const REQUESTED_SAMPLE_RATE = 16_000;
// AssemblyAI accepts 50 ms–1 s of audio per message; mic buffers are grouped
// to at least 100 ms, and a short final chunk is padded with silence to 50 ms.
const MIN_CHUNK_MS = 100;
const MIN_FINAL_CHUNK_MS = 50;
const FINISH_TIMEOUT_MS = 10_000;

// Haptics are unsupported on some platforms (web); feedback is best-effort.
const vibrate = {
  start: () =>
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => {},
    ),
  stop: () =>
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {}),
  cancel: () =>
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {}),
};

function removeRecording(uri: string | null) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The operating system may already have removed a temporary recording.
  }
}

function concatChunks(chunks: Uint8Array[], extraBytes = 0) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(length + extraBytes);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

// Writes 16-bit mono PCM as a WAV file so the HTTP transcription endpoint can
// take over when live streaming isn't available.
function writeWavRecording(chunks: Uint8Array[], sampleRate: number) {
  const pcm = concatChunks(chunks);
  const wav = new Uint8Array(44 + pcm.length);
  const view = new DataView(wav.buffer);
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1)
      view.setUint8(offset + index, text.charCodeAt(index));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);

  const file = new File(Paths.cache, `voice-${Date.now()}.wav`);
  file.create({ overwrite: true });
  file.write(wav);
  return file.uri;
}

// Peak level of a 16-bit PCM buffer in dBFS (-160 for silence, 0 at full scale).
function peakDecibels(bytes: Uint8Array) {
  const samples = new Int16Array(
    bytes.buffer,
    bytes.byteOffset,
    Math.floor(bytes.byteLength / 2),
  );
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.abs(samples[index]!);
    if (value > peak) peak = value;
  }
  return peak ? 20 * Math.log10(peak / 32768) : -160;
}

function getApiError(error: unknown) {
  const response = (
    error as { response?: { data?: { message?: unknown }; status?: unknown } }
  ).response;
  return {
    message:
      typeof response?.data?.message === "string"
        ? response.data.message
        : null,
    status: typeof response?.status === "number" ? response.status : null,
  };
}

export function useVoiceTranscription(
  value: string,
  onChangeText: (text: string) => void,
) {
  const client = useApiClient();
  const [state, setState] = useState<VoiceState>("idle");
  const [durationMillis, setDurationMillis] = useState(0);
  const stateRef = useRef<VoiceState>("idle");
  const textRef = useRef(value);
  const onChangeTextRef = useRef(onChangeText);
  const recordingUriRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const tokenRequestRef = useRef<AbortController | null>(null);
  const startVersionRef = useRef(0);
  const mountedRef = useRef(true);
  // Mic level in dBFS for the waveform, read on its own timer.
  const meterRef = useRef(-160);

  // Audio captured in the current recording: everything (for the HTTP
  // fallback), the part not yet grouped into a chunk, and chunks waiting for
  // the socket to open.
  const audioRef = useRef<Uint8Array[]>([]);
  const pendingRef = useRef<Uint8Array[]>([]);
  const pendingBytesRef = useRef(0);
  const unsentRef = useRef<Uint8Array[]>([]);
  const sampleRateRef = useRef(REQUESTED_SAMPLE_RATE);
  const sampleCountRef = useRef(0);
  // Text in the prompt before recording; live transcript is appended to it.
  const baseTextRef = useRef("");
  const sessionRef = useRef<VoiceStreamingSession | null>(null);
  const liveSessionRef = useRef<VoiceStreamingSession | null>(null);
  const streamingFailedRef = useRef(false);
  const connectPromiseRef = useRef<Promise<VoiceStreamingSession | null> | null>(
    null,
  );

  textRef.current = value;
  onChangeTextRef.current = onChangeText;

  const changeState = (next: VoiceState) => {
    stateRef.current = next;
    if (mountedRef.current) setState(next);
  };
  const isCurrentState = (expected: VoiceState) =>
    stateRef.current === expected;

  const setText = (next: string) => {
    if (!mountedRef.current) return;
    textRef.current = next;
    onChangeTextRef.current(next);
  };
  const withBaseText = (text: string) => {
    const base = baseTextRef.current;
    if (!text) return base;
    return base ? `${base.trimEnd()} ${text}` : text;
  };

  const dispatchChunk = (chunk: Uint8Array) => {
    if (streamingFailedRef.current) return;
    if (liveSessionRef.current) liveSessionRef.current.send(chunk);
    else unsentRef.current.push(chunk);
  };

  const handleBuffer = (buffer: AudioStreamBuffer) => {
    if (stateRef.current !== "recording") return;
    const bytes = new Uint8Array(buffer.data.slice(0));
    if (!bytes.length) return;
    sampleRateRef.current = buffer.sampleRate;
    audioRef.current.push(bytes);
    meterRef.current = peakDecibels(bytes);

    sampleCountRef.current += bytes.length / 2;
    const elapsed = (sampleCountRef.current / buffer.sampleRate) * 1000;
    // Whole seconds are all the timer shows; avoid re-rendering per buffer.
    setDurationMillis((previous) =>
      Math.floor(previous / 1000) === Math.floor(elapsed / 1000)
        ? previous
        : elapsed,
    );

    pendingRef.current.push(bytes);
    pendingBytesRef.current += bytes.length;
    if (pendingBytesRef.current >= (buffer.sampleRate * 2 * MIN_CHUNK_MS) / 1000) {
      dispatchChunk(concatChunks(pendingRef.current));
      pendingRef.current = [];
      pendingBytesRef.current = 0;
    }
  };

  const { stream } = useAudioStream({
    channels: 1,
    encoding: "int16",
    onBuffer: handleBuffer,
    sampleRate: REQUESTED_SAMPLE_RATE,
  });

  const flushPendingAudio = () => {
    if (!pendingBytesRef.current) return;
    const minBytes = Math.round(
      (sampleRateRef.current * 2 * MIN_FINAL_CHUNK_MS) / 1000,
    );
    // Pad with silence (zero bytes) so the last message meets the minimum.
    dispatchChunk(
      concatChunks(
        pendingRef.current,
        Math.max(minBytes - pendingBytesRef.current, 0),
      ),
    );
    pendingRef.current = [];
    pendingBytesRef.current = 0;
  };

  const closeSession = () => {
    sessionRef.current?.close();
    sessionRef.current = null;
    liveSessionRef.current = null;
  };

  // Live streaming is gone for this recording: drop what the socket produced
  // and let the recorded audio go through the HTTP endpoint on stop.
  const failStreaming = () => {
    if (streamingFailedRef.current) return;
    streamingFailedRef.current = true;
    closeSession();
    unsentRef.current = [];
    if (
      stateRef.current === "recording" ||
      stateRef.current === "stopping" ||
      stateRef.current === "transcribing"
    ) {
      setText(baseTextRef.current);
    }
  };

  const resetRecording = () => {
    audioRef.current = [];
    pendingRef.current = [];
    pendingBytesRef.current = 0;
    unsentRef.current = [];
    sampleCountRef.current = 0;
    meterRef.current = -160;
    streamingFailedRef.current = false;
    connectPromiseRef.current = null;
    if (mountedRef.current) setDurationMillis(0);
  };

  // Ends the recording without transcribing it and restores the prompt.
  const abortRecording = () => {
    startVersionRef.current += 1;
    stream.stop();
    closeSession();
    setText(baseTextRef.current);
    resetRecording();
    changeState("idle");
  };

  const connect = async (
    tokenPromise: Promise<string>,
    version: number,
  ): Promise<VoiceStreamingSession | null> => {
    const isStale = () =>
      !mountedRef.current || startVersionRef.current !== version;
    try {
      const token = await tokenPromise;
      if (isStale() || streamingFailedRef.current) return null;
      const session = openVoiceStreamingSession({
        onClose: () => {
          if (!isStale()) failStreaming();
        },
        onTranscript: (text) => {
          if (isStale() || streamingFailedRef.current) return;
          setText(withBaseText(text));
        },
        sampleRate: sampleRateRef.current,
        token,
      });
      sessionRef.current = session;
      await session.ready;
      if (isStale() || streamingFailedRef.current) {
        session.close();
        return null;
      }
      // Send what was spoken while connecting, then stream live.
      for (const chunk of unsentRef.current) session.send(chunk);
      unsentRef.current = [];
      liveSessionRef.current = session;
      return session;
    } catch (error) {
      if (isStale()) return null;
      const apiError = getApiError(error);
      // Transcribing over HTTP instead would bypass the balance check and the
      // rate limit, so these end the recording.
      if (apiError.status === 429) {
        abortRecording();
        Toast.show({
          type: "error",
          text1: "Voice limit reached",
          text2:
            apiError.message ??
            "Too many voice requests. Please try again later.",
        });
        return null;
      }
      if (apiError.message?.toLowerCase().startsWith("insufficient balance")) {
        abortRecording();
        Toast.show({
          type: "error",
          text1: "Insufficient balance",
          text2: "Voice input needs at least $0.10. Tap to open your wallet.",
          onPress: () => {
            Toast.hide();
            router.push("/wallet");
          },
          visibilityTime: 5000,
        });
        return null;
      }
      failStreaming();
      return null;
    } finally {
      tokenRequestRef.current = null;
    }
  };

  const transcribe = async (uri: string) => {
    recordingUriRef.current = uri;
    changeState("transcribing");
    const request = new AbortController();
    requestRef.current = request;
    try {
      const text = (
        await client.speechText.transcribeAudio(uri, request.signal)
      ).trim();
      if (request.signal.aborted || !mountedRef.current) return;
      const current = textRef.current;
      setText(current ? `${current.trimEnd()} ${text}` : text);
      recordingUriRef.current = null;
      removeRecording(uri);
      changeState("idle");
    } catch {
      if (!request.signal.aborted && mountedRef.current) {
        changeState("error");
        Toast.show({
          type: "error",
          text1: "Could not transcribe recording",
          text2: "Tap ↻ to retry or × to discard it.",
        });
      }
    } finally {
      if (requestRef.current === request) requestRef.current = null;
    }
  };

  const start = async () => {
    if (stateRef.current !== "idle") return;
    const version = ++startVersionRef.current;
    const isStale = () =>
      !mountedRef.current ||
      !isCurrentState("starting") ||
      startVersionRef.current !== version;
    changeState("starting");
    try {
      // On Android, requesting always launches the system permission
      // activity, even when already granted, which steals window focus and
      // dismisses the keyboard. Only request when not granted yet.
      const current = await getRecordingPermissionsAsync();
      const permission = current.granted
        ? current
        : await requestRecordingPermissionsAsync();
      if (isStale()) return;
      if (!permission.granted) {
        Toast.show({
          type: "error",
          text1: "Microphone permission needed",
          text2: "Allow microphone access to dictate a prompt.",
        });
        changeState("idle");
        return;
      }

      resetRecording();
      baseTextRef.current = textRef.current;
      // The token is fetched while the mic starts; audio captured before the
      // socket opens is queued and sent once it does.
      const tokenRequest = new AbortController();
      tokenRequestRef.current = tokenRequest;
      const tokenPromise = client.speechText.createStreamingToken(
        tokenRequest.signal,
      );
      tokenPromise.catch(() => {});

      await stream.start();
      if (isStale()) {
        tokenRequest.abort();
        stream.stop();
        return;
      }
      sampleRateRef.current = stream.sampleRate || REQUESTED_SAMPLE_RATE;
      changeState("recording");
      vibrate.start();
      connectPromiseRef.current = connect(tokenPromise, version);
    } catch {
      if (isStale()) return;
      tokenRequestRef.current?.abort();
      stream.stop();
      changeState("idle");
      Toast.show({
        type: "error",
        text1: "Could not start recording",
        text2: "Please try again.",
      });
    }
  };

  const stop = async () => {
    if (stateRef.current !== "recording") return;
    const version = startVersionRef.current;
    changeState("stopping");
    vibrate.stop();
    stream.stop();
    flushPendingAudio();
    if (!audioRef.current.length) {
      closeSession();
      changeState("idle");
      return;
    }
    changeState("transcribing");

    const session = await connectPromiseRef.current;
    if (
      !mountedRef.current ||
      startVersionRef.current !== version ||
      !isCurrentState("transcribing")
    )
      return;

    if (session && !streamingFailedRef.current) {
      try {
        const text = await session.finish(FINISH_TIMEOUT_MS);
        if (
          !mountedRef.current ||
          startVersionRef.current !== version ||
          !isCurrentState("transcribing")
        )
          return;
        closeSession();
        setText(withBaseText(text));
        resetRecording();
        changeState("idle");
        if (!text) {
          Toast.show({
            type: "info",
            text1: "No speech detected",
            text2: "Try recording again a little closer to the mic.",
          });
        }
        return;
      } catch {
        if (startVersionRef.current !== version) return;
        failStreaming();
      }
    }

    try {
      const uri = writeWavRecording(audioRef.current, sampleRateRef.current);
      resetRecording();
      await transcribe(uri);
    } catch {
      if (!mountedRef.current || !isCurrentState("transcribing")) return;
      changeState("error");
      Toast.show({
        type: "error",
        text1: "Could not save recording",
        text2: "Tap ↻ to try again or × to discard it.",
      });
    }
  };

  const cancel = async () => {
    if (stateRef.current === "canceling") return;
    const previous = stateRef.current;
    startVersionRef.current += 1;
    changeState("canceling");
    vibrate.cancel();
    tokenRequestRef.current?.abort();
    tokenRequestRef.current = null;
    requestRef.current?.abort();
    requestRef.current = null;
    if (previous === "recording" || previous === "starting") stream.stop();
    closeSession();
    // Only these states can have live transcript text to take back out.
    if (
      previous === "recording" ||
      previous === "stopping" ||
      previous === "transcribing"
    )
      setText(baseTextRef.current);
    resetRecording();
    removeRecording(recordingUriRef.current);
    recordingUriRef.current = null;
    changeState("idle");
  };

  useEffect(() => {
    if (state === "recording" && durationMillis >= MAX_RECORDING_MS) {
      void stop();
    }
  }, [durationMillis, state]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      tokenRequestRef.current?.abort();
      requestRef.current?.abort();
      sessionRef.current?.close();
      if (stateRef.current === "recording") stream.stop();
      removeRecording(recordingUriRef.current);
    };
  }, [stream]);

  return {
    state,
    durationMillis,
    meter: meterRef,
    start,
    stop,
    cancel,
    retry: () => {
      if (stateRef.current !== "error") return;
      if (recordingUriRef.current) void transcribe(recordingUriRef.current);
      else void cancel().then(start);
    },
  };
}
