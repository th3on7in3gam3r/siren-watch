/**
 * Captures PCM for the classifier and runs band-limited DFT on the
 * audio thread so detection keeps working when the main thread is throttled.
 */
const FFT_SIZE = 2048;
const HOP = FFT_SIZE / 2;
const BAR_COUNT = 32;

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.minHz = 500;
    this.maxHz = 1800;
    this.buffer = new Float32Array(FFT_SIZE);
    this.writePos = 0;

    this.port.onmessage = (event) => {
      if (event.data?.type !== "config") return;
      if (typeof event.data.minHz === "number") this.minHz = event.data.minHz;
      if (typeof event.data.maxHz === "number") this.maxHz = event.data.maxHz;
    };
  }

  analyzeSpectrum() {
    const sr = sampleRate;
    const binHz = sr / FFT_SIZE;
    const minBin = Math.max(1, Math.floor(this.minHz / binHz));
    const maxBin = Math.min(
      Math.floor(FFT_SIZE / 2),
      Math.ceil(this.maxHz / binHz)
    );

    let maxMag = 0;
    let maxBinIdx = minBin;
    const magnitudes = new Float32Array(maxBin - minBin + 1);

    for (let k = minBin; k <= maxBin; k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < FFT_SIZE; n++) {
        const angle = (2 * Math.PI * k * n) / FFT_SIZE;
        const sample = this.buffer[n];
        re += sample * Math.cos(angle);
        im -= sample * Math.sin(angle);
      }
      const mag = Math.sqrt(re * re + im * im) / FFT_SIZE;
      magnitudes[k - minBin] = mag;
      if (mag > maxMag) {
        maxMag = mag;
        maxBinIdx = k;
      }
    }

    const peak = maxBinIdx * binHz;
    const db = maxMag <= 1e-8 ? -100 : 20 * Math.log10(maxMag);

    const bars = new Array(BAR_COUNT);
    const span = magnitudes.length;
    let barMax = 0;
    for (let i = 0; i < BAR_COUNT; i++) {
      const idx = Math.min(span - 1, Math.floor((i / BAR_COUNT) * span));
      barMax = Math.max(barMax, magnitudes[idx]);
    }
    const norm = barMax > 0 ? barMax : 1;
    for (let i = 0; i < BAR_COUNT; i++) {
      const idx = Math.min(span - 1, Math.floor((i / BAR_COUNT) * span));
      bars[i] = magnitudes[idx] / norm;
    }

    return { peak, db, bars };
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (output) {
      if (input) {
        output.set(input);
      } else {
        output.fill(0);
      }
    }

    if (!input || input.length === 0) return true;

    const copy = input.slice();
    this.port.postMessage({ type: "pcm", samples: copy }, [copy.buffer]);

    for (let i = 0; i < input.length; i++) {
      this.buffer[this.writePos++] = input[i];
      if (this.writePos >= FFT_SIZE) {
        const spectrum = this.analyzeSpectrum();
        this.port.postMessage({
          type: "spectrum",
          peak: spectrum.peak,
          db: spectrum.db,
          bars: spectrum.bars,
          timestamp: currentTime,
        });
        this.buffer.copyWithin(0, HOP);
        this.writePos = HOP;
      }
    }

    return true;
  }
}

registerProcessor("pcm-capture-processor", PcmCaptureProcessor);
