const STREAMING_URL = "wss://streaming.assemblyai.com/v3/ws";

type StreamingMessage =
  | { type: "Begin" }
  | { type: "Turn"; transcript: string; turn_order: number }
  | { type: "Termination" }
  | { error: string; type?: undefined };

export type VoiceStreamingSession = {
  /** Resolves once AssemblyAI has accepted the session. */
  ready: Promise<void>;
  send: (chunk: Uint8Array) => void;
  /** Ends the session and resolves with the final transcript. */
  finish: (timeoutMs: number) => Promise<string>;
  close: () => void;
};

// One AssemblyAI Universal-Streaming session over a single-use token. Turns
// arrive unformatted first and are replaced by their formatted version, so the
// transcript is rebuilt from the latest text of each turn.
export function openVoiceStreamingSession({
  onClose,
  onTranscript,
  sampleRate,
  token,
}: {
  /** Called when the socket closes before `finish` was requested. */
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

  let settleReady: { resolve: () => void; reject: (error: Error) => void };
  const ready = new Promise<void>((resolve, reject) => {
    settleReady = { resolve, reject };
  });
  // Rejections are observed by whoever awaits `ready`; this avoids an
  // unhandled rejection when nobody does (e.g. the user canceled).
  ready.catch(() => {});
  let isReady = false;
  let settleFinish:
    | { resolve: (text: string) => void; reject: (error: Error) => void }
    | undefined;
  let closed = false;
  let failed = false;

  // Error and close events both fire on a dropped socket; report once.
  const fail = (message: string) => {
    if (failed) return;
    failed = true;
    const error = new Error(message);
    if (!isReady) settleReady.reject(error);
    if (settleFinish) settleFinish.reject(error);
    else if (isReady) onClose();
    settleFinish = undefined;
  };

  socket.onmessage = (event) => {
    if (typeof event.data !== "string") return;
    let message: StreamingMessage;
    try {
      message = JSON.parse(event.data) as StreamingMessage;
    } catch {
      return;
    }
    if ("error" in message && message.error) {
      fail(message.error);
      close();
      return;
    }
    if (message.type === "Begin") {
      isReady = true;
      settleReady.resolve();
    } else if (message.type === "Turn") {
      turns.set(message.turn_order, message.transcript);
      onTranscript(transcript());
    } else if (message.type === "Termination") {
      settleFinish?.resolve(transcript());
      settleFinish = undefined;
      close();
    }
  };
  socket.onerror = () => {
    fail("Voice streaming connection failed");
  };
  socket.onclose = (event) => {
    closed = true;
    fail(event.reason || `Voice streaming closed (${event.code})`);
  };

  function close() {
    if (closed) return;
    closed = true;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.close();
  }

  return {
    ready,
    send: (chunk) => {
      if (isReady && socket.readyState === WebSocket.OPEN) {
        // Copy into a standalone buffer: `chunk` may be a view into a larger one.
        socket.send(chunk.slice().buffer);
      }
    },
    finish: (timeoutMs) =>
      new Promise<string>((resolve, reject) => {
        if (closed || socket.readyState !== WebSocket.OPEN) {
          reject(new Error("Voice streaming connection is closed"));
          return;
        }
        const timeout = setTimeout(() => {
          settleFinish = undefined;
          close();
          reject(new Error("Timed out waiting for the final transcript"));
        }, timeoutMs);
        settleFinish = {
          resolve: (text) => {
            clearTimeout(timeout);
            resolve(text);
          },
          reject: (error) => {
            clearTimeout(timeout);
            reject(error);
          },
        };
        socket.send(JSON.stringify({ type: "Terminate" }));
      }),
    close: () => {
      settleFinish = undefined;
      close();
    },
  };
}
