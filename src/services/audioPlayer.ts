/**
 * AudioPlayer handles ultra-low-latency streaming PCM playback from Gemini Live.
 * It schedules incoming raw 24kHz PCM chunks sequentially into the Web Audio API timeline,
 * tracks playback completion reliably across multi-turn dialogues, and supports instant interruption.
 */
export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private scheduledNodes: AudioBufferSourceNode[] = [];
  private isPlaying: boolean = false;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;
  private turnEndedOnServer: boolean = false;
  private checkDrainTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  public async init(existingContext?: AudioContext, sampleRate = 24000): Promise<AudioContext> {
    if (existingContext && existingContext.state !== "closed") {
      this.audioCtx = existingContext;
    } else if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate });
    }

    if (!this.analyser && this.audioCtx) {
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.2;
      this.analyser.connect(this.audioCtx.destination);
    }

    if (this.audioCtx && this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  /**
   * Enqueue a 16-bit PCM chunk for immediate gapless playback.
   */
  public playChunk(pcmData: Int16Array, sampleRate = 24000): void {
    if (!this.audioCtx || !this.analyser) {
      return;
    }

    this.turnEndedOnServer = false;
    if (this.checkDrainTimeout) {
      clearTimeout(this.checkDrainTimeout);
      this.checkDrainTimeout = null;
    }

    // Convert Int16 linear PCM to Float32 [-1.0, 1.0]
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      float32Data[i] = pcmData[i] / 32768.0;
    }

    const audioBuffer = this.audioCtx.createBuffer(1, float32Data.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser);

    const currentTime = this.audioCtx.currentTime;
    // Schedule seamlessly right after previous chunk, or right now if clock has drifted
    const startTime = Math.max(currentTime + 0.005, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    this.scheduledNodes.push(source);

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onPlaybackStateChange?.(true);
    }

    source.onended = () => {
      const idx = this.scheduledNodes.indexOf(source);
      if (idx > -1) {
        this.scheduledNodes.splice(idx, 1);
      }

      // If all scheduled buffers have finished playing
      if (this.scheduledNodes.length === 0) {
        // Small grace period (40ms) to ensure another chunk isn't currently arriving
        if (this.checkDrainTimeout) clearTimeout(this.checkDrainTimeout);
        this.checkDrainTimeout = setTimeout(() => {
          if (this.scheduledNodes.length === 0) {
            this.isPlaying = false;
            if (this.audioCtx) {
              this.nextStartTime = this.audioCtx.currentTime;
            }
            this.onPlaybackStateChange?.(false);
          }
        }, 40);
      }
    };
  }

  /**
   * Called when server indicates turn complete (generation ended).
   */
  public onTurnComplete(): void {
    this.turnEndedOnServer = true;
    if (this.scheduledNodes.length === 0) {
      this.isPlaying = false;
      if (this.audioCtx) {
        this.nextStartTime = this.audioCtx.currentTime;
      }
      this.onPlaybackStateChange?.(false);
    }
  }

  /**
   * CRITICAL FOR BARGE-IN: Stops all playing/queued audio immediately and resets the clock.
   */
  public stopAndClear(): void {
    if (this.checkDrainTimeout) {
      clearTimeout(this.checkDrainTimeout);
      this.checkDrainTimeout = null;
    }

    for (const node of this.scheduledNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Node might have already finished
      }
    }
    this.scheduledNodes = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    this.isPlaying = false;
    this.turnEndedOnServer = false;
    this.onPlaybackStateChange?.(false);
  }

  /**
   * Returns normalized RMS volume level [0.0, 1.0] for driving reactive UI rings.
   */
  public getVolumeLevel(): number {
    if (!this.analyser || !this.isPlaying) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(1.0, avg / 128.0);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public async close(): Promise<void> {
    this.stopAndClear();
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      try {
        await this.audioCtx.close();
      } catch {
        // Ignore close error
      }
      this.audioCtx = null;
    }
  }
}
