import { useApiClient } from "@repo/api-hooks";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File } from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

type VoiceState =
  | "idle"
  | "starting"
  | "recording"
  | "stopping"
  | "transcribing"
  | "canceling"
  | "error";

const MAX_RECORDING_MS = 120_000;

function removeRecording(uri: string | null) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The operating system may already have removed a temporary recording.
  }
}

export function useVoiceTranscription(
  value: string,
  onChangeText: (text: string) => void,
) {
  const client = useApiClient();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [state, setState] = useState<VoiceState>("idle");
  const stateRef = useRef<VoiceState>("idle");
  const textRef = useRef(value);
  const onChangeTextRef = useRef(onChangeText);
  const recordingUriRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const startVersionRef = useRef(0);
  const mountedRef = useRef(true);

  textRef.current = value;
  onChangeTextRef.current = onChangeText;

  const changeState = (next: VoiceState) => {
    stateRef.current = next;
    if (mountedRef.current) setState(next);
  };
  const isCurrentState = (expected: VoiceState) =>
    stateRef.current === expected;

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
      const next = current ? `${current.trimEnd()} ${text}` : text;
      textRef.current = next;
      onChangeTextRef.current(next);
      recordingUriRef.current = null;
      removeRecording(uri);
      changeState("idle");
    } catch {
      if (!request.signal.aborted && mountedRef.current) {
        changeState("error");
        Alert.alert(
          "Could not transcribe recording",
          "Tap the microphone to retry or Cancel to discard it.",
        );
      }
    } finally {
      if (requestRef.current === request) requestRef.current = null;
    }
  };

  const start = async () => {
    if (stateRef.current !== "idle") return;
    const version = ++startVersionRef.current;
    changeState("starting");
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (
        !mountedRef.current ||
        !isCurrentState("starting") ||
        startVersionRef.current !== version
      )
        return;
      if (!permission.granted) {
        Alert.alert(
          "Microphone permission needed",
          "Allow microphone access to dictate a prompt.",
        );
        changeState("idle");
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      if (
        !mountedRef.current ||
        !isCurrentState("starting") ||
        startVersionRef.current !== version
      )
        return;
      await recorder.prepareToRecordAsync();
      if (
        !mountedRef.current ||
        !isCurrentState("starting") ||
        startVersionRef.current !== version
      )
        return;
      recorder.record();
      changeState("recording");
    } catch {
      if (
        !mountedRef.current ||
        !isCurrentState("starting") ||
        startVersionRef.current !== version
      )
        return;
      changeState("idle");
      Alert.alert("Could not start recording", "Please try again.");
    }
  };

  const stop = async () => {
    if (stateRef.current !== "recording") return;
    changeState("stopping");
    let stopPromise: Promise<void> | null = null;
    try {
      stopPromise = recorder.stop();
      stopPromiseRef.current = stopPromise;
      await stopPromise;
      const uri = recorder.uri;
      if (!isCurrentState("stopping")) {
        removeRecording(uri);
        return;
      }
      if (!uri) throw new Error("No recording was saved");
      if (!mountedRef.current) {
        removeRecording(uri);
        return;
      }
      await transcribe(uri);
    } catch {
      if (!mountedRef.current || !isCurrentState("stopping")) return;
      changeState("error");
      Alert.alert(
        "Could not save recording",
        "Tap the microphone to try again or Cancel.",
      );
    } finally {
      if (stopPromiseRef.current === stopPromise) stopPromiseRef.current = null;
    }
  };

  const cancel = async () => {
    if (stateRef.current === "canceling") return;
    const previous = stateRef.current;
    startVersionRef.current += 1;
    changeState("canceling");
    requestRef.current?.abort();
    requestRef.current = null;
    if (previous === "recording") {
      try {
        await recorder.stop();
        removeRecording(recorder.uri);
      } catch {
        // A failed stop cannot produce a recording to upload.
      }
    } else if (previous === "stopping") {
      try {
        await stopPromiseRef.current;
      } catch {
        // The stop handler owns reporting a recording failure.
      }
    }
    removeRecording(recordingUriRef.current);
    recordingUriRef.current = null;
    changeState("idle");
  };

  useEffect(() => {
    if (
      state === "recording" &&
      recorderState.durationMillis >= MAX_RECORDING_MS
    ) {
      void stop();
    }
  }, [recorderState.durationMillis, state]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      const uri = recordingUriRef.current;
      if (stateRef.current === "recording") {
        void recorder
          .stop()
          .then(() => removeRecording(recorder.uri))
          .catch(() => {});
      }
      removeRecording(uri);
    };
  }, [recorder]);

  return {
    state,
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
