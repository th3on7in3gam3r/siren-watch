/**
 * Resamples a mono Float32Array from its original sample rate to
 * `targetRate` using an OfflineAudioContext, which lets the browser's
 * own (high quality) resampler do the work instead of a hand-rolled
 * linear interpolation.
 */
export async function resampleTo16k(
  input: Float32Array,
  sourceSampleRate: number,
  targetRate = 16000
): Promise<Float32Array> {
  if (sourceSampleRate === targetRate) return input;

  const OfflineCtx =
    window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;

  const durationSec = input.length / sourceSampleRate;
  const targetLength = Math.max(1, Math.ceil(durationSec * targetRate));

  const offlineCtx: OfflineAudioContext = new OfflineCtx(
    1,
    targetLength,
    targetRate
  );

  const buffer = offlineCtx.createBuffer(1, input.length, sourceSampleRate);
  buffer.copyToChannel(input as Float32Array<ArrayBuffer>, 0);

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start();

  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0).slice();
}

/** Small ring buffer for accumulating raw PCM samples off the main audio graph. */
export class RollingAudioBuffer {
  private chunks: Float32Array[] = [];
  private totalLength = 0;
  private readonly maxLength: number;

  constructor(maxSamples: number) {
    this.maxLength = maxSamples;
  }

  push(chunk: Float32Array) {
    this.chunks.push(chunk.slice());
    this.totalLength += chunk.length;
    while (this.totalLength > this.maxLength && this.chunks.length > 1) {
      const removed = this.chunks.shift()!;
      this.totalLength -= removed.length;
    }
  }

  /** True once enough audio has accumulated to fill the buffer. */
  isFull(): boolean {
    return this.totalLength >= this.maxLength;
  }

  toFloat32Array(): Float32Array {
    const out = new Float32Array(this.totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}
