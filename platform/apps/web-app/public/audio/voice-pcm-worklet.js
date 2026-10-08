/* Same-origin, lazy-loaded microphone processor. No React or network access. */
class VoicePCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.weight = 0;
    this.sum = 0;
    this.samples = 0;
    this.chunk = new ArrayBuffer(3200); // 100 ms of mono signed 16-bit PCM.
    this.view = new DataView(this.chunk);
    this.length = 0;
    this.peak = 0;
    this.stopped = false;
    this.port.onmessage = ({ data }) => {
      if (data.type === "flush") {
        this.stopped = true;
        this.flush();
        this.port.postMessage({ type: "flushed" });
      }
    };
  }
  flush() {
    if (!this.length) return;
    const buffer = this.chunk.slice(0, this.length * 2);
    this.port.postMessage(
      { type: "pcm", buffer, samples: this.samples, peak: this.peak },
      [buffer],
    );
    this.length = 0;
    this.peak = 0;
  }
  emit(value) {
    const clipped = Math.max(-1, Math.min(1, value));
    this.view.setInt16(
      this.length * 2,
      Math.round(clipped * (clipped < 0 ? 32768 : 32767)),
      true,
    );
    this.peak = Math.max(this.peak, Math.abs(clipped));
    this.length++;
    this.samples++;
    if (this.length === 1600) this.flush();
    if (this.samples === 16000 * 120) {
      this.stopped = true;
      this.flush();
      this.port.postMessage({ type: "limit" });
    }
  }
  process(inputs) {
    const channels = inputs[0];
    if (this.stopped || !channels?.length) return true;
    // Integrate source samples into 16 kHz windows. Fractional overlap carries
    // across render quanta, including 44.1 kHz input; no rate relabeling.
    for (let i = 0; i < channels[0].length && !this.stopped; i++) {
      let mono = 0;
      for (const channel of channels) mono += channel[i];
      mono /= channels.length;
      let remaining = 1;
      while (remaining > 1e-9 && !this.stopped) {
        const portion = Math.min(remaining, this.ratio - this.weight);
        this.sum += mono * portion;
        this.weight += portion;
        remaining -= portion;
        if (this.weight >= this.ratio - 1e-9) {
          this.emit(this.sum / this.ratio);
          this.weight = 0;
          this.sum = 0;
        }
      }
    }
    // The processor intentionally leaves outputs silent.
    return true;
  }
}
registerProcessor("voice-pcm", VoicePCMProcessor);
