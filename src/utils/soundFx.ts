// Synthesized Web Audio API sound effects & procedural Bangkok quarantine ambient soundscape

export type AmbientSceneMode =
  | 'off'
  | 'city_rain'
  | 'radio_tower'
  | 'nest_pulse'
  | 'human_heartbeat';

class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public ambientEnabled: boolean = false;
  public currentAmbientMode: AmbientSceneMode = 'off';

  private ambientNodes: {
    stopAll: () => void;
  } | null = null;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  click() {
    this.playChoiceClick();
  }

  success() {
    this.playFixSuccess();
  }

  warning() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [260, 195].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.05, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.14);
      });
    } catch {
      // ignore audio errors
    }
  }

  patchToggle() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // ignore
    }
  }

  copy() {
    this.playFixSuccess();
  }

  playChoiceClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // ignore
    }
  }

  playFixSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.07, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.16);
      });
    } catch {
      // ignore
    }
  }

  playEndingChime(isGood: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = isGood ? [440, 554.37, 659.25, 880] : [392, 349.23, 311.13, 261.63];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.08, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.28);
      });
    } catch {
      // ignore
    }
  }

  /** เสียงหัวใจเต้น "ตึก-ตัก" (ใช้ในฉากจบกลับมาเป็นมนุษย์ หรือกดฟังจังหวะชีพจร) */
  playHeartbeatPulse() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [0, 0.24].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const startFreq = idx === 0 ? 68 : 54;
        osc.frequency.setValueAtTime(startFreq, now + offset);
        osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.16);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(idx === 0 ? 0.18 : 0.12, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.19);
      });
    } catch {
      // ignore
    }
  }

  /** เสียงไซเรนเตือนภัยเขตกักกันแว่วมาแต่ไกล */
  playDistantSiren() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(620, now);

      osc.frequency.setValueAtTime(290, now);
      osc.frequency.linearRampToValueAtTime(440, now + 1.1);
      osc.frequency.linearRampToValueAtTime(270, now + 2.3);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.028, now + 0.6);
      gain.gain.linearRampToValueAtTime(0.02, now + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.45);
    } catch {
      // ignore
    }
  }

  /** เสียงคลื่นวิทยุซ่าๆ และสัญญาณมอร์สสั้นๆ */
  playRadioStaticBurst() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const sampleRate = ctx.sampleRate;
      const length = Math.floor(sampleRate * 0.45);
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.35;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1350, now);
      filter.Q.setValueAtTime(2.4, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
      source.stop(now + 0.45);

      // Subtle radio carrier blip
      const beep = ctx.createOscillator();
      const beepGain = ctx.createGain();
      beep.type = 'sine';
      beep.frequency.setValueAtTime(980, now + 0.12);
      beepGain.gain.setValueAtTime(0.02, now + 0.12);
      beepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      beep.connect(beepGain);
      beepGain.connect(ctx.destination);
      beep.start(now + 0.12);
      beep.stop(now + 0.25);
    } catch {
      // ignore
    }
  }

  /** เสียงการกลายพันธุ์ระดับเซลล์ */
  playMutationAwakening() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [110, 146.83, 220].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + idx * 0.08 + 0.32);
        gain.gain.setValueAtTime(0.04, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.36);
      });
    } catch {
      // ignore
    }
  }

  /** หยุดเสียงบรรยากาศทั้งหมด */
  stopAmbience() {
    if (this.ambientNodes) {
      try {
        this.ambientNodes.stopAll();
      } catch {
        // ignore
      }
      this.ambientNodes = null;
    }
    this.currentAmbientMode = 'off';
  }

  /** เปิด/สลับโหมดเสียงบรรยากาศเขตกักกันกรุงเทพฯ */
  startAmbience(mode: AmbientSceneMode) {
    if (!this.enabled || !this.ambientEnabled || mode === 'off') {
      this.stopAmbience();
      return;
    }
    if (this.currentAmbientMode === mode && this.ambientNodes) {
      return;
    }
    this.stopAmbience();
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const cleanups: Array<() => void> = [];

      // 1. Deep Atmospheric Quarantine Drone
      const droneOsc1 = ctx.createOscillator();
      const droneOsc2 = ctx.createOscillator();
      const droneFilter = ctx.createBiquadFilter();
      const droneGain = ctx.createGain();

      const baseFreq =
        mode === 'nest_pulse'
          ? 48.99
          : mode === 'radio_tower'
          ? 65.41
          : mode === 'human_heartbeat'
          ? 73.42
          : 55.0;

      droneOsc1.type = 'sine';
      droneOsc2.type = 'triangle';
      droneOsc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      droneOsc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime);

      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(mode === 'human_heartbeat' ? 240 : 160, ctx.currentTime);

      droneGain.gain.setValueAtTime(0.001, ctx.currentTime);
      droneGain.gain.linearRampToValueAtTime(0.022, ctx.currentTime + 1.2);

      droneOsc1.connect(droneFilter);
      droneOsc2.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(ctx.destination);

      droneOsc1.start();
      droneOsc2.start();
      cleanups.push(() => {
        try {
          droneOsc1.stop();
          droneOsc2.stop();
          droneOsc1.disconnect();
          droneOsc2.disconnect();
        } catch {
          // ignore
        }
      });

      // 2. Soft Bangkok Night Rain / Wind Loop (2-second pink-ish noise buffer)
      const rainLength = ctx.sampleRate * 2;
      const rainBuffer = ctx.createBuffer(1, rainLength, ctx.sampleRate);
      const rainData = rainBuffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0;
      for (let i = 0; i < rainLength; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        rainData[i] = (b0 + b1 + b2 + white * 0.1848) * 0.04;
      }

      const rainSource = ctx.createBufferSource();
      rainSource.buffer = rainBuffer;
      rainSource.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = mode === 'radio_tower' ? 'bandpass' : 'lowpass';
      rainFilter.frequency.setValueAtTime(
        mode === 'radio_tower' ? 1150 : mode === 'nest_pulse' ? 420 : 820,
        ctx.currentTime
      );

      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(
        mode === 'human_heartbeat' ? 0.008 : 0.018,
        ctx.currentTime
      );

      rainSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(ctx.destination);
      rainSource.start();
      cleanups.push(() => {
        try {
          rainSource.stop();
          rainSource.disconnect();
        } catch {
          // ignore
        }
      });

      // 3. Periodic atmospheric cues (heartbeat for human ending, radio static for tower, distant siren for city)
      const intervalId = window.setInterval(() => {
        if (!this.enabled || !this.ambientEnabled) return;
        if (mode === 'human_heartbeat') {
          this.playHeartbeatPulse();
        } else if (mode === 'radio_tower') {
          if (Math.random() < 0.45) this.playRadioStaticBurst();
        } else if (mode === 'city_rain') {
          if (Math.random() < 0.22) this.playDistantSiren();
        } else if (mode === 'nest_pulse') {
          this.playHeartbeatPulse();
        }
      }, mode === 'human_heartbeat' ? 1350 : 6500);

      cleanups.push(() => window.clearInterval(intervalId));

      this.currentAmbientMode = mode;
      this.ambientNodes = {
        stopAll: () => {
          cleanups.forEach(fn => fn());
        },
      };
    } catch {
      // ignore
    }
  }

  /** ซิงก์เสียงบรรยากาศตามย่านที่อยู่หรือฉากจบอัตโนมัติ */
  syncSceneAmbience(placeId?: string, endingId?: string) {
    if (!this.enabled || !this.ambientEnabled) {
      this.stopAmbience();
      return;
    }
    if (endingId === 'human') {
      this.startAmbience('human_heartbeat');
      return;
    }
    if (placeId === 'tower' || placeId === 'radio') {
      this.startAmbience('radio_tower');
      return;
    }
    if (placeId === 'nest' || placeId === 'bkk_pier') {
      this.startAmbience('nest_pulse');
      return;
    }
    this.startAmbience('city_rain');
  }
}

export const soundFx = new SoundManager();
