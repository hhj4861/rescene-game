import type { MemberId } from './types';

/**
 * 플레이어 애니메이션 순수 로직(캐릭터 v2 부록 §3). Phaser 없이 타이머·상태 전이만 다루고
 * entities/Player 와 scenes/CombatController 가 이 값으로 애니·물리 정지를 실행한다.
 */

export type ChainStep = 1 | 2 | 3;
export type AttackAnim = 'attack1' | 'attack2' | 'attack3';
export type IdleAnim = 'idle' | 'flourish';

/** 대기(입력 없음·지상·속도 0) 6초 → 개인기 1회. */
export const FLOURISH_AFTER_MS = 6000;
/** flourish 는 1프레임·frameRate 1 이므로 1초 보여주고 idle 로 돌아온다. */
export const FLOURISH_MS = 1000;
/** 체인 3타 히트스톱(물리 일시정지) 길이. */
export const HITSTOP_MS = 60;
/** 제나 필살기(까엉턴): 이 간격으로 좌우 반전을 토글해 회전 느낌을 낸다. */
export const ZENA_SPIN_FLIP_MS = 120;
/** 피격 시 말버릇(lines.hurt) 말풍선이 뜰 확률. */
export const HURT_LINE_CHANCE = 0.2;
export const HURT_LINE_MS = 700;

export const attackAnimFor = (step: ChainStep): AttackAnim => `attack${step}`;
export const hitstopMsFor = (step: ChainStep): number => (step === 3 ? HITSTOP_MS : 0);

/** 3타이고 물리가 아직 안 멈춰 있을 때만(필살기·사망 정지와 겹치지 않게). */
export const canStartHitstop = (step: ChainStep, isPaused: boolean): boolean => hitstopMsFor(step) > 0 && !isPaused;

/**
 * 히트스톱 해제 판단. `serial` 은 월드 pause 가 일어난 횟수 — 우리가 멈춘 뒤 다른 pause(필살기·사망)가
 * 끼어들었으면 그쪽이 resume 을 책임지므로 건드리지 않는다.
 */
export const shouldResumeHitstop = (startedSerial: number, currentSerial: number, isPaused: boolean): boolean =>
  isPaused && startedSerial === currentSerial;

export interface IdleAnimState {
  /** 쉬고 있는 누적 시간. flourish 중에는 0. */
  idleMs: number;
  /** flourish 재생 경과. null 이면 재생 중이 아니다. */
  flourishMs: number | null;
}
export const IDLE_START: IdleAnimState = { idleMs: 0, flourishMs: null };

/**
 * 대기 애니 상태기계 한 틱. `resting` 이 아니면(이동·점프·입력·동작 덮어쓰기) 즉시 리셋하고 null 을 돌려
 * 호출자가 walk/jump 를 고르게 한다. 6초 쉬면 flourish 1회, 끝나면 idle 로 돌아오고 타이머를 다시 센다.
 */
export function nextIdleAnim(state: IdleAnimState, dtMs: number, resting: boolean): { state: IdleAnimState; anim: IdleAnim | null } {
  if (!resting) return { state: IDLE_START, anim: null };
  if (state.flourishMs !== null) {
    const flourishMs = state.flourishMs + dtMs;
    if (flourishMs >= FLOURISH_MS) return { state: IDLE_START, anim: 'idle' };
    return { state: { idleMs: 0, flourishMs }, anim: 'flourish' };
  }
  const idleMs = state.idleMs + dtMs;
  if (idleMs >= FLOURISH_AFTER_MS) return { state: { idleMs: 0, flourishMs: 0 }, anim: 'flourish' };
  return { state: { idleMs, flourishMs: null }, anim: 'idle' };
}

/** 필살기 포즈의 flipX. 제나만 120ms 마다 반전을 토글하고 나머지는 바라보는 방향 그대로. */
export function superFlipX(member: MemberId, elapsedMs: number, facing: 1 | -1): boolean {
  const base = facing === -1;
  if (member !== 'zena') return base;
  return Math.floor(elapsedMs / ZENA_SPIN_FLIP_MS) % 2 === 1 ? !base : base;
}
