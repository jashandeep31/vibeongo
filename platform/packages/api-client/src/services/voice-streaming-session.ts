const STREAMING_URL = "wss://streaming.assemblyai.com/v3/ws";
const MAX_BUFFERED_BYTES = 256_000;

export type VoiceStreamingSession = {
  ready: Promise<void>;
  send: (chunk: Uint8Array) => void;
  finish: (timeoutMs: number) => Promise<string>;
  close: () => void;
};

// Capture is platform specific; turn revisions and socket lifetime are shared.
export function openVoiceStreamingSession({
  onClose,
  onTranscript,
  sampleRate,
  token,
}: {
  onClose: () => void;
  onTranscript: (text: string) => void;
  sampleRate: number;
  token: string;
}): VoiceStreamingSession {
  const params = new URLSearchParams({
    encoding: "pcm_s16le",
    format_turns: "true",
    sample_rate: String(Math.round(sampleRate)),
    token,
  });
  const socket = new WebSocket(`${STREAMING_URL}?${params}`);
  socket.binaryType = "arraybuffer";
  const turns = new Map<number, string>();
  const transcript = () =>
    [...turns.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, text]) => text.trim())
      .filter(Boolean)
      .join(" ");
  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // A cancel may arrive before the caller starts awaiting readiness.
  void ready.catch(() => {});
  let isReady = false;
  let closed = false;
  let finishPromise: Promise<string> | undefined;
  let finishSettlement:
    | {
        resolve: (text: string) => void;
        reject: (error: Error) => void;
      }
    | undefined;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  const readyTimer = setTimeout(
    () => fail("Timed out connecting to voice streaming"),
    10_000,
  );

  function dispose() {
    closed = true;
    clearTimeout(readyTimer);
    clearTimeout(finishTimer);
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    socket.close();
  }
  function fail(message: string, notify = true) {
    if (closed) return;
    const error = new Error(message);
    const wasFinishing = Boolean(finishSettlement);
    rejectReady(error);
    finishSettlement?.reject(error);
    finishSettlement = undefined;
    dispose();
    if (notify && isReady && !wasFinishing) onClose();
  }
  socket.onmessage = (event) => {
    if (closed || typeof event.data !== "string") return;
    let message: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(event.data);
      if (!parsed || typeof parsed !== "object") return;
      message = parsed as Record<string, unknown>;
    } catch {
      return;
    }
    if (typeof message.error === "string" && message.error) {
      fail(message.error);
    } else if (message.type === "Begin") {
      isReady = true;
      clearTimeout(readyTimer);
      resolveReady();
    } else if (
      message.type === "Turn" &&
      typeof message.turn_order === "number" &&
      typeof message.transcript === "string"
    ) {
      // A formatted turn replaces its partial text, never appends a duplicate.
      turns.set(message.turn_order, message.transcript);
      onTranscript(transcript());
    } else if (message.type === "Termination") {
      if (!finishSettlement) {
        fail("Voice streaming ended unexpectedly");
        return;
      }
      finishSettlement.resolve(transcript());
      finishSettlement = undefined;
      dispose();
    }
  };
  socket.onerror = () => fail("Voice streaming connection failed");
  socket.onclose = (event) =>
    fail(event.reason || `Voice streaming closed (${event.code})`);

  return {
    ready,
    send: (chunk) => {
      if (closed) return;
      if (!isReady || socket.readyState !== WebSocket.OPEN) {
        fail("Voice streaming connection is not ready");
        return;
      }
      if (socket.bufferedAmount + chunk.length > MAX_BUFFERED_BYTES) {
        fail("Voice streaming connection is too slow");
        return;
      }
      try {
        socket.send(chunk.slice().buffer);
      } catch {
        fail("Could not send audio to voice streaming");
      }
    },
    finish: (timeoutMs) => {
      if (finishPromise) return finishPromise;
      finishPromise = new Promise<string>((resolve, reject) => {
        if (closed || !isReady || socket.readyState !== WebSocket.OPEN) {
          reject(new Error("Voice streaming connection is closed"));
          return;
        }
        finishSettlement = { resolve, reject };
        finishTimer = setTimeout(
          () => fail("Timed out waiting for the final transcript"),
          timeoutMs,
        );
        try {
          socket.send(JSON.stringify({ type: "Terminate" }));
        } catch {
          fail("Could not finish voice streaming");
        }
      });
      void finishPromise.catch(() => {});
      return finishPromise;
    },
    // Cancellation settles promises without reporting a transport failure.
    close: () => fail("Voice streaming canceled", false),
  };
}
