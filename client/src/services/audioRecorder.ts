/**
 * High-Fidelity 16kHz PCM Audio Recorder & WAV Encoder
 * 
 * Captures clean, uncompressed microphone audio from Web Audio API,
 * resamples to 16,000 Hz mono (the native sample rate for Sarvam STT),
 * and generates standard 16-bit PCM WAV blobs.
 * 
 * Completely eliminates browser WebM codec incompatibilities and header loss.
 */

export class PcmAudioRecorder {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRecording = false;
  private isCapturingSpeech = false;

  // Circular pre-roll buffer (~400ms) to ensure speech onset is not clipped
  private preRollBuffer: Float32Array[] = [];
  private preRollMaxChunks = 10; // ~400ms at 2048 samples/chunk

  // Active speech recording chunks
  private recordedChunks: Float32Array[] = [];
  private targetSampleRate = 16000;

  /**
   * Initialize recorder with media stream and audio context.
   */
  public initialize(stream: MediaStream, audioCtx?: AudioContext): void {
    this.cleanup();

    this.audioContext =
      audioCtx ||
      new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    this.sourceNode = this.audioContext.createMediaStreamSource(stream);

    // Buffer size 2048 samples, 1 input channel, 1 output channel
    this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;

      const inputChannelData = e.inputBuffer.getChannelData(0);
      const inputCopy = new Float32Array(inputChannelData);

      if (this.isCapturingSpeech) {
        this.recordedChunks.push(inputCopy);
      } else {
        // Keep sliding pre-roll window
        this.preRollBuffer.push(inputCopy);
        if (this.preRollBuffer.length > this.preRollMaxChunks) {
          this.preRollBuffer.shift();
        }
      }
    };

    this.sourceNode.connect(this.processorNode);
    // Connect to destination through a zero-gain node or destination to keep processor alive
    this.processorNode.connect(this.audioContext.destination);
  }

  /**
   * Start listening turn (buffers pre-roll).
   */
  public startTurn(): void {
    this.isRecording = true;
    this.isCapturingSpeech = false;
    this.recordedChunks = [];
    this.preRollBuffer = [];
  }

  /**
   * Mark that speech has started — move pre-roll into recorded chunks and begin full recording.
   */
  public onSpeechStart(): void {
    if (!this.isRecording) return;
    this.isCapturingSpeech = true;
    this.recordedChunks = [...this.preRollBuffer];
    this.preRollBuffer = [];
  }

  /**
   * Stop recording and return the encoded 16kHz mono WAV Blob.
   */
  public stopTurn(): Blob | null {
    this.isRecording = false;
    this.isCapturingSpeech = false;

    if (this.recordedChunks.length === 0) {
      this.preRollBuffer = [];
      return null;
    }

    // 1. Flatten all recorded Float32 chunks into a single array
    let totalLength = 0;
    for (const chunk of this.recordedChunks) {
      totalLength += chunk.length;
    }

    const mergedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.recordedChunks) {
      mergedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    this.recordedChunks = [];
    this.preRollBuffer = [];

    // 2. Resample from context sample rate (typically 44.1k or 48k) to 16,000 Hz
    const currentSampleRate = this.audioContext ? this.audioContext.sampleRate : 48000;
    const resampled = resamplePcm(mergedSamples, currentSampleRate, this.targetSampleRate);

    // 3. Encode to standard 16-bit PCM WAV Blob
    return encodeWav(resampled, this.targetSampleRate);
  }

  /**
   * Teardown Web Audio nodes.
   */
  public cleanup(): void {
    this.isRecording = false;
    this.isCapturingSpeech = false;
    this.recordedChunks = [];
    this.preRollBuffer = [];

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch { /* ignore */ }
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch { /* ignore */ }
      this.sourceNode = null;
    }
  }
}

/**
 * Resample Float32 PCM audio data using linear interpolation.
 */
function resamplePcm(
  source: Float32Array,
  sourceRate: number,
  targetRate: number
): Float32Array {
  if (sourceRate === targetRate) {
    return source;
  }

  const ratio = sourceRate / targetRate;
  const newLength = Math.round(source.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const sourceIndex = i * ratio;
    const indexLow = Math.floor(sourceIndex);
    const indexHigh = Math.min(indexLow + 1, source.length - 1);
    const weight = sourceIndex - indexLow;

    result[i] = (1 - weight) * source[indexLow] + weight * source[indexHigh];
  }

  return result;
}

/**
 * Encode Float32Array PCM samples to 16-bit Mono WAV Blob.
 */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");

  // "fmt " sub-chunk
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true);  // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate (16000)
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true);  // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // "data" sub-chunk
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM integer samples
  let byteOffset = 44;
  for (let i = 0; i < samples.length; i++, byteOffset += 2) {
    // Clamp sample between -1.0 and 1.0
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(byteOffset, intSample, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
