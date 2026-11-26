/**
 * VayuMitra Ambient Wind Sound Engine (Original Procedural Web Audio Synthesizer)
 *
 * - Synthesizes a soft, natural, looping breeze using pink/brown filtered noise
 *   modulated by slow organic LFOs — 100% original audio, zero external copyrighted files.
 * - Strictly user-initiated: NEVER autoplays or initializes AudioContext on page load.
 * - Single-instance playback guard: prevents multiple overlapping wind streams.
 * - Includes an optional subtle calculation confirmation chime (debounced, opt-in only).
 * - Degrades gracefully if Web Audio API is unavailable or restricted.
 */

export interface AmbientSoundSnapshot {
  supported: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0.0 to 1.0
  activeInstances: number;
  error: string | null;
}

type AudioContextConstructor = typeof AudioContext;

function getAudioContextCtor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as Window & {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

export class AmbientWindEngine {
  private ctx: AudioContext | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfoPrimary: OscillatorNode | null = null;
  private lfoSecondary: OscillatorNode | null = null;
  private masterGain: GainNode | null = null;
  private windBuffer: AudioBuffer | null = null;

  private isPlaying = false;
  private isMuted = false;
  private volume = 0.35; // Soft, non-distracting default level
  private activeInstances = 0;
  private error: string | null = null;
  private lastChimeMs = 0;
  private listeners = new Set<(snapshot: AmbientSoundSnapshot) => void>();

  public isSupported(): boolean {
    return getAudioContextCtor() !== null;
  }

  public getSnapshot(): AmbientSoundSnapshot {
    return {
      supported: this.isSupported(),
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      volume: this.volume,
      activeInstances: this.activeInstances,
      error: this.error,
    };
  }

  public subscribe(listener: (snapshot: AmbientSoundSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  private createNaturalWindBuffer(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const durationSec = 6;
    const length = sampleRate * durationSec;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      // Pink/brown-weighted noise generator for warm, smooth air movement (no harsh white hiss)
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;

        // Crossfade first/last 0.4s so looping is completely click-free
        const fadeSamples = Math.floor(sampleRate * 0.4);
        let env = 1;
        if (i < fadeSamples) {
          env = i / fadeSamples;
        } else if (i > length - fadeSamples) {
          env = (length - i) / fadeSamples;
        }
        data[i] = pink * env;
      }
    }
    return buffer;
  }

  private getEffectiveGain(): number {
    if (this.isMuted) return 0.0001;
    // Keep max ambient ceiling gentle and comfortable
    return Math.max(0.0001, Math.min(1, this.volume) * 0.42);
  }

  public async start(): Promise<boolean> {
    // Single-instance guard: never layer duplicate wind streams
    if (this.isPlaying && this.activeInstances === 1) {
      return true;
    }

    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      this.error = 'Ambient audio is not supported in this browser.';
      this.isPlaying = false;
      this.activeInstances = 0;
      this.emit();
      return false;
    }

    // Ensure any stale nodes are fully torn down before starting
    this.teardownNodes();

    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      if (!this.windBuffer || this.windBuffer.sampleRate !== this.ctx.sampleRate) {
        this.windBuffer = this.createNaturalWindBuffer(this.ctx);
      }

      const now = this.ctx.currentTime;

      const source = this.ctx.createBufferSource();
      source.buffer = this.windBuffer;
      source.loop = true;

      // Primary warm breeze filter
      const bodyFilter = this.ctx.createBiquadFilter();
      bodyFilter.type = 'lowpass';
      bodyFilter.frequency.setValueAtTime(340, now);
      bodyFilter.Q.setValueAtTime(1.1, now);

      // Secondary airy tree-canopy whisper filter
      const airFilter = this.ctx.createBiquadFilter();
      airFilter.type = 'bandpass';
      airFilter.frequency.setValueAtTime(560, now);
      airFilter.Q.setValueAtTime(1.6, now);

      const bodyGain = this.ctx.createGain();
      bodyGain.gain.setValueAtTime(0.75, now);
      const airGain = this.ctx.createGain();
      airGain.gain.setValueAtTime(0.32, now);

      // Slow organic LFOs so the breeze gently rises and falls
      const lfoPrimary = this.ctx.createOscillator();
      lfoPrimary.type = 'sine';
      lfoPrimary.frequency.setValueAtTime(0.085, now);
      const lfoPrimaryDepth = this.ctx.createGain();
      lfoPrimaryDepth.gain.setValueAtTime(125, now);
      lfoPrimary.connect(lfoPrimaryDepth);
      lfoPrimaryDepth.connect(bodyFilter.frequency);

      const lfoSecondary = this.ctx.createOscillator();
      lfoSecondary.type = 'sine';
      lfoSecondary.frequency.setValueAtTime(0.14, now);
      const lfoSecondaryDepth = this.ctx.createGain();
      lfoSecondaryDepth.gain.setValueAtTime(180, now);
      lfoSecondary.connect(lfoSecondaryDepth);
      lfoSecondaryDepth.connect(airFilter.frequency);

      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(this.getEffectiveGain(), now + 0.75);

      source.connect(bodyFilter);
      bodyFilter.connect(bodyGain);
      bodyGain.connect(master);

      source.connect(airFilter);
      airFilter.connect(airGain);
      airGain.connect(master);

      master.connect(this.ctx.destination);

      source.start(now);
      lfoPrimary.start(now);
      lfoSecondary.start(now);

      this.noiseSource = source;
      this.lfoPrimary = lfoPrimary;
      this.lfoSecondary = lfoSecondary;
      this.masterGain = master;
      this.isPlaying = true;
      this.activeInstances = 1;
      this.error = null;
      this.emit();
      return true;
    } catch {
      this.teardownNodes();
      this.error = 'Unable to start ambient wind audio in this browser session.';
      this.isPlaying = false;
      this.activeInstances = 0;
      this.emit();
      return false;
    }
  }

  private teardownNodes(): void {
    try {
      this.noiseSource?.stop();
    } catch {
      // ignore already stopped
    }
    try {
      this.lfoPrimary?.stop();
    } catch {
      // ignore
    }
    try {
      this.lfoSecondary?.stop();
    } catch {
      // ignore
    }
    try {
      this.noiseSource?.disconnect();
      this.lfoPrimary?.disconnect();
      this.lfoSecondary?.disconnect();
      this.masterGain?.disconnect();
    } catch {
      // ignore
    }
    this.noiseSource = null;
    this.lfoPrimary = null;
    this.lfoSecondary = null;
    this.masterGain = null;
  }

  public stop(): void {
    if (!this.isPlaying && this.activeInstances === 0) return;

    const ctx = this.ctx;
    const gain = this.masterGain;
    const src = this.noiseSource;
    const lfo1 = this.lfoPrimary;
    const lfo2 = this.lfoSecondary;

    this.noiseSource = null;
    this.lfoPrimary = null;
    this.lfoSecondary = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.activeInstances = 0;
    this.emit();

    if (ctx && gain) {
      try {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
        setTimeout(() => {
          try {
            src?.stop();
            lfo1?.stop();
            lfo2?.stop();
            src?.disconnect();
            lfo1?.disconnect();
            lfo2?.disconnect();
            gain.disconnect();
          } catch {
            // ignore
          }
        }, 320);
        return;
      } catch {
        // fallback immediate teardown
      }
    }

    try {
      src?.stop();
      lfo1?.stop();
      lfo2?.stop();
      src?.disconnect();
      lfo1?.disconnect();
      lfo2?.disconnect();
      gain?.disconnect();
    } catch {
      // ignore
    }
  }

  public async toggle(): Promise<boolean> {
    if (this.isPlaying) {
      this.stop();
      return false;
    }
    return this.start();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.ctx && this.masterGain && this.isPlaying) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.getEffectiveGain(), now + 0.12);
    }
    this.emit();
  }

  public toggleMute(): void {
    this.setMuted(!this.isMuted);
  }

  public setVolume(nextVolume: number): void {
    const clamped = Number.isFinite(nextVolume) ? Math.max(0, Math.min(1, nextVolume)) : 0.35;
    this.volume = clamped;
    if (clamped > 0 && this.isMuted) {
      this.isMuted = false;
    }
    if (this.ctx && this.masterGain && this.isPlaying) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.getEffectiveGain(), now + 0.1);
    }
    this.emit();
  }

  /**
   * Plays a very soft, brief confirmation tone ONLY when the user has enabled
   * ambient sound (and it is unmuted). Strictly debounced so repeated actions
   * never stack or distract.
   */
  public playCalculationConfirmation(): void {
    if (!this.isPlaying || this.isMuted || this.volume <= 0.01) return;
    if (!this.ctx || this.ctx.state !== 'running') return;

    const nowMs = Date.now();
    if (nowMs - this.lastChimeMs < 700) return;
    this.lastChimeMs = nowMs;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);

      const peak = Math.min(0.055, this.volume * 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch {
      // Never block UI calculations if audio fails
    }
  }
}

export const ambientWindEngine = new AmbientWindEngine();

export const AMBIENT_SOUND_SECTIONS = new Set(['dashboard', 'travel', 'intelligence']);
