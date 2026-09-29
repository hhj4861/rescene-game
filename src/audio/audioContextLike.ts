// AudioBus가 실제 브라우저 AudioContext와 테스트용 가짜 컨텍스트 양쪽을 다룰 수 있도록
// 필요한 최소 인터페이스만 뽑아낸 타입. Phaser에 의존하지 않는다.

export interface GainLike {
  gain: {
    value: number;
    setValueAtTime(v: number, t: number): void;
    linearRampToValueAtTime(v: number, t: number): void;
    exponentialRampToValueAtTime(v: number, t: number): void;
  };
  connect(n: unknown): void;
  disconnect(): void;
}

export interface OscLike {
  type: string;
  frequency: {
    value: number;
    setValueAtTime(v: number, t: number): void;
    linearRampToValueAtTime(v: number, t: number): void;
  };
  connect(n: unknown): void;
  start(t: number): void;
  stop(t: number): void;
  onended: (() => void) | null;
}

export interface AudioContextLike {
  currentTime: number;
  state: string;
  destination: unknown;
  resume(): Promise<void>;
  createOscillator(): OscLike;
  createGain(): GainLike;
  createBuffer(ch: number, len: number, rate: number): { getChannelData(c: number): Float32Array };
  createBufferSource(): { buffer: unknown; connect(n: unknown): void; start(t: number): void; stop(t: number): void };
  sampleRate: number;
}
