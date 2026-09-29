// Web Audio API를 직접 다루는 절차적 재생기. 음성 블립(speak)·효과음(sfx)·BGM 시퀀서(bgm)를
// 담당한다. Phaser Sound는 파일 재생에만 쓰고, 절차적 합성은 전부 여기서 처리한다.
import type { VoiceNote, VoiceWave } from '../systems/voice';
import { SFX, type SfxName, type SfxSpec } from './sfxData';
import { BGM, type BgmId, type BgmTrack } from './bgmData';
import type { AudioContextLike, GainLike, OscLike } from './audioContextLike';

const ATTACK_MS = 5;
const RELEASE_MS = 20;
const BGM_LOOKAHEAD_SEC = 0.2;
const BGM_TICK_MS = 50;

export class AudioBus {
  private readonly ctx: AudioContextLike;
  private readonly master: GainLike;
  private oscCount = 0;
  private activeSpeechOscs: OscLike[] = [];
  private bgmTrack: BgmTrack | null = null;
  private bgmStepIndex = 0;
  private bgmNextTime = 0;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  muted = false;

  constructor(ctx: AudioContextLike) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(ctx.destination);
  }

  /** window.AudioContext(또는 webkit 접두사 버전)이 없으면 null을 돌려준다. */
  static create(): AudioBus | null {
    const w = globalThis as unknown as {
      AudioContext?: new () => AudioContextLike;
      webkitAudioContext?: new () => AudioContextLike;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    try {
      return new AudioBus(new Ctor());
    } catch {
      return null;
    }
  }

  /** 첫 사용자 입력에서 호출한다. 정지 상태(autoplay 정책)면 재개시킨다. */
  unlock(): void {
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.master.gain.value = m ? 0 : 1;
  }

  /** 테스트용: 지금까지 만든 oscillator 수. */
  get scheduledCount(): number {
    return this.oscCount;
  }

  private oscType(wave: VoiceWave): string {
    return wave === 'pulse' ? 'square' : wave;
  }

  private waveGainScale(wave: VoiceWave): number {
    // 'pulse'는 Web Audio 기본 파형에 없어 square + 12.5% 듀티 근사로 대체한다.
    return wave === 'pulse' ? 0.7 : 1;
  }

  private playTone(
    wave: VoiceWave,
    freq: number,
    startAt: number,
    durationMs: number,
    gain: number,
    slideTo?: number,
  ): OscLike {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    osc.type = this.oscType(wave);
    osc.frequency.value = freq;
    osc.frequency.setValueAtTime(freq, startAt);
    const stopAt = startAt + durationMs / 1000;
    if (slideTo !== undefined) {
      osc.frequency.linearRampToValueAtTime(slideTo, stopAt);
    }
    const peak = Math.max(0, Math.min(1, gain * this.waveGainScale(wave)));
    const attackEnd = startAt + ATTACK_MS / 1000;
    const releaseStart = Math.max(attackEnd, stopAt - RELEASE_MS / 1000);
    gainNode.gain.value = 0;
    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(peak, attackEnd);
    gainNode.gain.setValueAtTime(peak, releaseStart);
    gainNode.gain.linearRampToValueAtTime(0, stopAt);
    osc.connect(gainNode);
    gainNode.connect(this.master);
    osc.onended = () => gainNode.disconnect();
    osc.start(startAt);
    osc.stop(stopAt);
    this.oscCount++;
    return osc;
  }

  private playNoise(gain: number, durationMs: number, startAt: number): void {
    const durationSec = durationMs / 1000;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * durationSec));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gainNode = this.ctx.createGain();
    const peak = Math.max(0, Math.min(1, gain));
    const attackEnd = startAt + ATTACK_MS / 1000;
    const stopAt = startAt + durationSec;
    const releaseStart = Math.max(attackEnd, stopAt - RELEASE_MS / 1000);
    gainNode.gain.value = 0;
    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(peak, attackEnd);
    gainNode.gain.setValueAtTime(peak, releaseStart);
    gainNode.gain.linearRampToValueAtTime(0, stopAt);
    source.connect(gainNode);
    gainNode.connect(this.master);
    source.start(startAt);
    source.stop(stopAt);
  }

  /** 진행 중이던 발화를 끊고 새 노트열을 재생한다. */
  speak(notes: VoiceNote[], gainScale = 0.6): void {
    for (const osc of this.activeSpeechOscs) {
      try {
        osc.stop(this.ctx.currentTime);
      } catch {
        /* 이미 멈춘 오실레이터면 무시한다 */
      }
    }
    this.activeSpeechOscs = [];
    if (this.muted) return;
    const base = this.ctx.currentTime;
    for (const note of notes) {
      const startAt = base + note.at / 1000;
      const osc = this.playTone(note.wave, note.freq, startAt, note.durationMs, note.gain * gainScale, note.slideTo);
      this.activeSpeechOscs.push(osc);
    }
  }

  /** SFX[name] 스펙을 스윕(또는 노이즈·아르페지오)으로 재생한다. */
  sfx(name: SfxName): void {
    if (this.muted) return;
    const spec: SfxSpec = SFX[name];
    const base = this.ctx.currentTime;
    if (spec.wave === 'noise') {
      this.playNoise(spec.gain, spec.durationMs, base);
      return;
    }
    if (spec.arp && spec.arp.length > 0) {
      const stepMs = spec.durationMs / spec.arp.length;
      spec.arp.forEach((semitone, i) => {
        const freq = spec.from * 2 ** (semitone / 12);
        this.playTone(spec.wave as VoiceWave, freq, base + (i * stepMs) / 1000, stepMs, spec.gain);
      });
      return;
    }
    const slideTo = spec.to !== spec.from ? spec.to : undefined;
    this.playTone(spec.wave as VoiceWave, spec.from, base, spec.durationMs, spec.gain, slideTo);
  }

  /** 시퀀서를 시작하거나(id) 멈춘다(null). 64스텝 루프를 lookahead 200ms로 예약한다. */
  bgm(id: BgmId | null): void {
    this.stopBgm();
    if (id === null) return;
    this.bgmTrack = BGM[id];
    this.bgmStepIndex = 0;
    this.bgmNextTime = this.ctx.currentTime;
    this.scheduleBgmSteps();
    this.bgmTimer = setInterval(() => this.scheduleBgmSteps(), BGM_TICK_MS);
  }

  private stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.bgmTrack = null;
  }

  private scheduleBgmSteps(): void {
    const track = this.bgmTrack;
    if (!track || this.muted) return;
    const stepSec = 60 / track.bpm / 4; // 16분음표 하나의 길이
    while (this.bgmNextTime < this.ctx.currentTime + BGM_LOOKAHEAD_SEC) {
      this.scheduleBgmStep(track, this.bgmStepIndex, this.bgmNextTime, stepSec);
      this.bgmNextTime += stepSec;
      this.bgmStepIndex = (this.bgmStepIndex + 1) % 64;
    }
  }

  private scheduleBgmStep(track: BgmTrack, stepIndex: number, at: number, stepSec: number): void {
    const noteMs = stepSec * 1000 * 0.9; // 스텝 사이 아주 짧게 끊어 음표 경계를 준다
    for (const channel of track.channels) {
      const semitone = channel.steps[stepIndex];
      if (semitone === null || semitone === undefined) continue;
      if (channel.wave === 'noise') {
        this.playNoise(channel.gain, noteMs, at);
        continue;
      }
      const freq = track.root * 2 ** channel.octave * 2 ** (semitone / 12);
      this.playTone(channel.wave, freq, at, noteMs, channel.gain);
    }
  }
}
