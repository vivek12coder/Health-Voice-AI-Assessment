/**
 * Voice Activity Detection (VAD) and Silence Detection Engine
 * 
 * Provides real-time audio energy analysis from browser microphone streams,
 * detects when user starts speaking, filters out short noise/clicks,
 * detects sustained silence (pause) to mark end of turn,
 * and caps maximum utterance length.
 */

export interface VadConfig {
  /** RMS volume threshold to trigger speech (0.0 to 1.0) */
  speechThreshold: number;
  /** Milliseconds of sustained silence before speech is finalized */
  silenceDurationMs: number;
  /** Minimum duration of speech required to qualify as an utterance (filters noise) */
  minSpeechDurationMs: number;
  /** Maximum duration of an utterance before auto-submitting (prevents runaway recording) */
  maxUtteranceDurationMs: number;
  /** Milliseconds of silence after entering listening before gentle prompt */
  noSpeechPromptMs: number;
}

export const DEFAULT_VAD_CONFIG: VadConfig = {
  speechThreshold: 0.022,
  silenceDurationMs: 1200,
  minSpeechDurationMs: 300,
  maxUtteranceDurationMs: 30000,
  noSpeechPromptMs: 12000,
};

export interface VadCallbacks {
  /** Emitted on each analysis frame with current normalized volume (0 - 100) */
  onVolumeChange?: (volume: number) => void;
  /** Emitted when speech activity begins */
  onSpeechStart?: () => void;
  /** Emitted when sustained silence is detected after valid speech */
  onSpeechEnd?: () => void;
  /** Emitted when no speech is detected after being in listening mode for noSpeechPromptMs */
  onNoSpeechTimeout?: () => void;
}

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private isListening = false;
  private isSpeaking = false;
  private hasSpokenValidUtterance = false;

  private speechStartTime: number | null = null;
  private silenceStartTime: number | null = null;
  private listeningStartTime: number | null = null;
  private noSpeechPromptTriggered = false;

  private config: VadConfig;
  private callbacks: VadCallbacks;
  private floatBuffer: Float32Array<ArrayBuffer> | null = null;

  constructor(callbacks: VadCallbacks, config: Partial<VadConfig> = {}) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_VAD_CONFIG, ...config };
  }

  /**
   * Update configuration parameters dynamically.
   */
  public updateConfig(newConfig: Partial<VadConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Initialize Web Audio nodes with the provided MediaStream.
   */
  public initialize(stream: MediaStream, audioCtx?: AudioContext): void {
    this.cleanup();

    this.audioContext = audioCtx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch((err) => {
        console.warn("[VAD] Failed to resume AudioContext:", err);
      });
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.2; // fast responsive analysis

    this.sourceNode.connect(this.analyser);
    this.floatBuffer = new Float32Array(this.analyser.fftSize);
  }

  /**
   * Start listening for speech activity.
   */
  public start(): void {
    if (!this.analyser || !this.floatBuffer) {
      console.warn("[VAD] Cannot start: AudioContext/Analyser not initialized");
      return;
    }

    this.isListening = true;
    this.isSpeaking = false;
    this.hasSpokenValidUtterance = false;
    this.speechStartTime = null;
    this.silenceStartTime = null;
    this.listeningStartTime = Date.now();
    this.noSpeechPromptTriggered = false;

    this.loop();
  }

  /**
   * Pause/stop VAD listening (e.g., when AI is speaking or during processing).
   */
  public stop(): void {
    this.isListening = false;
    this.isSpeaking = false;
    this.hasSpokenValidUtterance = false;
    this.speechStartTime = null;
    this.silenceStartTime = null;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.callbacks.onVolumeChange) {
      this.callbacks.onVolumeChange(0);
    }
  }

  /**
   * Main analysis loop executing on requestAnimationFrame.
   */
  private loop = (): void => {
    if (!this.isListening || !this.analyser || !this.floatBuffer) {
      return;
    }

    this.analyser.getFloatTimeDomainData(this.floatBuffer);

    // Compute Root Mean Square (RMS) energy
    let sum = 0;
    const len = this.floatBuffer.length;
    for (let i = 0; i < len; i++) {
      const sample = this.floatBuffer[i];
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / len);

    // Normalized volume for UI meter (0 to 100)
    const normalizedVolume = Math.min(100, Math.round(rms * 450));
    this.callbacks.onVolumeChange?.(normalizedVolume);

    const now = Date.now();
    const isAboveThreshold = rms >= this.config.speechThreshold;

    if (isAboveThreshold) {
      // Audio energy detected
      this.silenceStartTime = null;

      if (!this.isSpeaking) {
        if (!this.speechStartTime) {
          this.speechStartTime = now;
        }

        const speechDuration = now - this.speechStartTime;
        if (speechDuration >= this.config.minSpeechDurationMs) {
          // Qualified speech started!
          this.isSpeaking = true;
          this.hasSpokenValidUtterance = true;
          this.callbacks.onSpeechStart?.();
        }
      } else {
        // Already speaking — check if exceeded maximum utterance duration
        if (this.speechStartTime && (now - this.speechStartTime) >= this.config.maxUtteranceDurationMs) {
          console.log("[VAD] Max utterance duration reached, finalizing speech");
          this.finalizeSpeech();
          return;
        }
      }
    } else {
      // Audio is below speech threshold (silence or background noise)
      if (this.isSpeaking) {
        // User was speaking, now is in silence
        if (this.silenceStartTime === null) {
          this.silenceStartTime = now;
        } else {
          const silenceDuration = now - this.silenceStartTime;
          if (silenceDuration >= this.config.silenceDurationMs) {
            // Sustained silence achieved! Finalize utterance
            console.log(`[VAD] Sustained silence detected (${silenceDuration}ms), finalizing speech`);
            this.finalizeSpeech();
            return;
          }
        }
      } else if (!this.hasSpokenValidUtterance && this.speechStartTime) {
        // Noise spike was shorter than minSpeechDurationMs — reset speech start
        if (now - this.speechStartTime > this.config.minSpeechDurationMs * 1.5) {
          this.speechStartTime = null;
        }
      } else if (!this.hasSpokenValidUtterance && this.listeningStartTime && !this.noSpeechPromptTriggered) {
        // Check for prolonged inactivity while listening
        if (now - this.listeningStartTime >= this.config.noSpeechPromptMs) {
          this.noSpeechPromptTriggered = true;
          this.callbacks.onNoSpeechTimeout?.();
        }
      }
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Finalize the speech utterance and inform the listener.
   */
  private finalizeSpeech(): void {
    this.stop();
    this.callbacks.onSpeechEnd?.();
  }

  /**
   * Full teardown of Web Audio resources.
   */
  public cleanup(): void {
    this.stop();

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch { /* ignore */ }
      this.sourceNode = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch { /* ignore */ }
      this.analyser = null;
    }

    this.floatBuffer = null;
  }
}
