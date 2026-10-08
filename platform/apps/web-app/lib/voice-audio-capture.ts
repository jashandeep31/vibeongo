export const VOICE_SAMPLE_RATE = 16_000;
export const MAX_VOICE_SECONDS = 120;

export type VoiceAudioCapture = {
  stop: () => Promise<void>;
  cancel: () => void;
};

type CaptureOptions = {
  signal: AbortSignal;
  onChunk: (chunk: Uint8Array, samples: number, peak: number) => void;
  onLimit: () => void;
  onInterrupted: () => void;
};

/** Called only from a user gesture; permission can resolve after cancellation. */
export async function startVoiceAudioCapture({
  signal,
  onChunk,
  onLimit,
  onInterrupted,
}: CaptureOptions): Promise<VoiceAudioCapture> {
  if (!window.isSecureContext)
    throw new Error("Microphone access requires HTTPS or localhost.");
  if (
    !navigator.mediaDevices?.getUserMedia ||
    !window.AudioContext ||
    !window.AudioWorkletNode
  ) {
    throw new Error(
      "Voice typing is unavailable in this browser. Try a current browser or type your message.",
    );
  }
  signal.throwIfAborted();
  const context = new AudioContext();
  if (!context.audioWorklet) {
    void context.close();
    throw new Error(
      "This browser does not support voice typing. Try a current browser.",
    );
  }
  let stream: MediaStream | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let node: AudioWorkletNode | undefined;
  let closed = false;
  let stopping: Promise<void> | undefined;
  let acknowledgeFlush: (() => void) | undefined;
  const dispose = () => {
    if (closed) return;
    closed = true;
    signal.removeEventListener("abort", dispose);
    context.onstatechange = null;
    if (node) {
      node.onprocessorerror = null;
      node.port.onmessage = null;
      node.disconnect();
    }
    source?.disconnect();
    stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    const flush = acknowledgeFlush;
    acknowledgeFlush = undefined;
    flush?.();
    void context.close().catch(() => {});
  };
  signal.addEventListener("abort", dispose, { once: true });
  // Resume now, while still in the microphone button's user activation.
  const resume = context.resume();
  void resume.catch(() => {});
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    if (closed || signal.aborted) {
      stream.getTracks().forEach((track) => track.stop());
      throw new DOMException("Recording canceled", "AbortError");
    }
    await resume;
    await context.audioWorklet.addModule("/audio/voice-pcm-worklet.js");
    signal.throwIfAborted();
    node = new AudioWorkletNode(context, "voice-pcm", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    node.port.onmessage = ({ data }) => {
      if (closed) return;
      if (data.type === "pcm" && data.buffer instanceof ArrayBuffer) {
        onChunk(
          new Uint8Array(data.buffer),
          data.samples as number,
          data.peak as number,
        );
      } else if (data.type === "limit") onLimit();
      else if (data.type === "flushed") acknowledgeFlush?.();
    };
    node.onprocessorerror = onInterrupted;
    stream.getAudioTracks().forEach((track) => {
      track.onended = onInterrupted;
    });
    context.onstatechange = () => {
      if (!closed && !stopping && context.state !== "running") onInterrupted();
    };
    source = context.createMediaStreamSource(stream);
    source.connect(node);
    // AudioWorklet emits zeros; connecting keeps it running without mic playback.
    node.connect(context.destination);
    if (context.state !== "running")
      throw new Error(
        "Microphone recording was interrupted. Try again with this tab open.",
      );
    return {
      cancel: dispose,
      stop: () => {
        if (stopping) return stopping;
        stopping = new Promise<void>((resolve) => {
          if (closed || !node) {
            resolve();
            return;
          }
          const timeout = setTimeout(() => {
            dispose();
            resolve();
          }, 300);
          acknowledgeFlush = () => {
            clearTimeout(timeout);
            acknowledgeFlush = undefined;
            dispose();
            resolve();
          };
          node.port.postMessage({ type: "flush" });
        });
        return stopping;
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

/** At most 3.84 MB for the bounded 120-second recording, below server limits. */
export function createVoiceWav(chunks: Uint8Array[]): Blob {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const wav = new Uint8Array(44 + length);
  const view = new DataView(wav.buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + length, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, VOICE_SAMPLE_RATE, true);
  view.setUint32(28, VOICE_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, length, true);
  let offset = 44;
  for (const chunk of chunks) {
    wav.set(chunk, offset);
    offset += chunk.length;
  }
  return new Blob([wav], { type: "audio/wav" });
}
