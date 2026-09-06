import { EventBus } from './EventBus';
import type { MemberId } from '../systems/types';
import {
  newRun,
  takeHit as applyTakeHit,
  isDead,
  loseLife as applyLoseLife,
  useContinue as applyUseContinue,
  heal as applyHeal,
  raiseMaxHearts,
  lowerMaxHearts,
  addGauge,
  isGaugeFull,
  spendGauge,
  addScore,
  recordKill,
  markBossHit as applyMarkBossHit,
  stageCleared,
  stageRestarted,
  type RunState,
} from '../systems/run';
import {
  emptyCombo,
  registerKill,
  comboExpired,
  comboMultiplier,
  killPoints,
  ELITE_SCORE,
  BOSS_SCORE,
  type ComboState,
} from '../systems/score';
import { addCard, buffTotals, comboWindowMs as calcComboWindowMs, type BuffKey, type BuffTotals } from '../systems/cards';

// RunState + ComboState + 버프를 묶고 이벤트를 낸다. phaser 미의존.
export type RunEvents = {
  changed: undefined;
  gaugeFull: undefined;
  combo: { count: number; multiplier: 1 | 2 | 3 };
  card: { memeId: string; dropped: string | null };
  died: undefined;
  lifeLost: { lives: number };
  stageClear: { bonus: number };
};

const HIT_GAUGE = 4;
const KILL_GAUGE = 12;
const ELITE_KILL_GAUGE = 30;

export class RunStore {
  readonly bus = new EventBus<RunEvents>();
  state: RunState;
  combo: ComboState = emptyCombo();
  private readonly lookupBuff: (id: string) => { key: BuffKey; value: number };
  private buffsCache: { cards: string[]; totals: BuffTotals } | null = null;

  constructor(member: MemberId, lookupBuff: (id: string) => { key: BuffKey; value: number }, stageIndex = 1) {
    this.state = newRun(member, stageIndex);
    this.lookupBuff = lookupBuff;
  }

  get buffs(): BuffTotals {
    if (!this.buffsCache || this.buffsCache.cards !== this.state.cards) {
      this.buffsCache = { cards: this.state.cards, totals: buffTotals(this.state.cards, this.lookupBuff) };
    }
    return this.buffsCache.totals;
  }

  get comboWindowMs(): number {
    return calcComboWindowMs(this.buffs);
  }

  hit(): void {
    const wasFull = isGaugeFull(this.state);
    this.state = addGauge(this.state, HIT_GAUGE, this.buffs);
    if (!wasFull && isGaugeFull(this.state)) this.bus.emit('gaugeFull', undefined);
    this.bus.emit('changed', undefined);
  }

  kill(baseScore: number, now: number, elite: boolean): void {
    this.combo = registerKill(this.combo, now, this.comboWindowMs);
    const points = killPoints(elite ? ELITE_SCORE : baseScore, this.combo.count);
    this.state = addScore(this.state, points, this.buffs);
    this.state = addGauge(this.state, elite ? ELITE_KILL_GAUGE : KILL_GAUGE, this.buffs);
    this.state = recordKill(this.state, this.combo.count);
    this.bus.emit('combo', { count: this.combo.count, multiplier: comboMultiplier(this.combo.count) });
    this.bus.emit('changed', undefined);
  }

  bossKilled(): void {
    this.state = addScore(this.state, BOSS_SCORE, this.buffs);
    this.bus.emit('changed', undefined);
  }

  takeHit(amount: number): void {
    this.state = applyTakeHit(this.state, amount);
    this.bus.emit('changed', undefined);
    if (isDead(this.state)) this.bus.emit('died', undefined);
  }

  markBossHit(): void {
    this.state = applyMarkBossHit(this.state);
  }

  heal(n: number): void {
    this.state = applyHeal(this.state, n);
    this.bus.emit('changed', undefined);
  }

  pickCard(memeId: string): void {
    const { cards, dropped } = addCard(this.state.cards, memeId);
    this.state = { ...this.state, cards };
    const { key, value } = this.lookupBuff(memeId);
    if (key === 'heart') this.state = raiseMaxHearts(this.state, value);
    if (dropped) {
      const gone = this.lookupBuff(dropped);
      if (gone.key === 'heart') this.state = lowerMaxHearts(this.state, gone.value);
    }
    this.bus.emit('card', { memeId, dropped });
    this.bus.emit('changed', undefined);
  }

  useSuper(): boolean {
    if (!isGaugeFull(this.state)) return false;
    this.state = spendGauge(this.state);
    this.bus.emit('changed', undefined);
    return true;
  }

  loseLife(): number {
    this.state = applyLoseLife(this.state);
    this.bus.emit('lifeLost', { lives: this.state.lives });
    this.bus.emit('changed', undefined);
    return this.state.lives;
  }

  useContinue(): boolean {
    const next = applyUseContinue(this.state);
    if (!next) return false;
    this.state = next;
    this.bus.emit('changed', undefined);
    return true;
  }

  stageClear(bonus: number): void {
    this.state = stageCleared(this.state, bonus);
    this.bus.emit('stageClear', { bonus });
    this.bus.emit('changed', undefined);
  }

  restartSection(): void {
    this.combo = emptyCombo();
    this.state = stageRestarted(this.state);
    this.bus.emit('changed', undefined);
  }

  tick(now: number): void {
    if (this.combo.count !== 0 && comboExpired(this.combo, now, this.comboWindowMs)) {
      this.combo = emptyCombo();
      this.bus.emit('combo', { count: 0, multiplier: comboMultiplier(0) });
    }
  }
}
