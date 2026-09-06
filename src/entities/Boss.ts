import { Enemy } from './Enemy';
import type { Player } from './Player';

export interface BossPhase { hpRatio: number; name: string }

/** 보스: 데이터의 `phases`(체력 비율 내림차순)로 라운드를 바꾼다. 넉백을 받지 않는다. */
export class Boss extends Enemy {
  /** 현재 페이즈 인덱스(0부터). */
  phase = 0;
  onPhaseChange: (phase: number, name: string) => void = () => {};
  fire: (x: number, y: number, dir: 1 | -1, speed: number, range: number) => void = () => {};
  private nextActionAt = 0;
  private dashUntil = 0;

  get phases(): BossPhase[] {
    return this.def.phases ?? [{ hpRatio: 1, name: this.def.name }];
  }

  phaseName(): string {
    return this.phases[this.phase]?.name ?? this.def.name;
  }

  /** 체력 비율 이하인 마지막 페이즈. phases[0].hpRatio 는 1 이라 항상 0 이상. */
  private phaseFor(ratio: number): number {
    let idx = 0;
    this.phases.forEach((p, i) => { if (ratio <= p.hpRatio) idx = i; });
    return idx;
  }

  override takeHit(amount: number): boolean {
    return super.takeHit(amount, 0);
  }

  override updateAi(player: Player, now: number): void {
    const target = this.phaseFor(this.hp / this.maxHp);
    if (target !== this.phase) {
      this.phase = target;
      this.invulnerableUntil = now + 800;
      this.nextActionAt = now + 800;
      this.setVelocityX(0);
      this.onPhaseChange(target, this.phaseName());
      return;
    }
    if (now < this.stunnedUntil) { this.setVelocityX(0); this.playAnim('idle'); return; }
    this.playAnim(this.phase >= 2 ? 'idle' : 'move');
    const dx = player.x - this.x;
    const dir: 1 | -1 = dx < 0 ? -1 : 1;
    this.setFlipX(dir === 1);

    if (this.phase === 0) {
      // 1라운드: 다가오며 탄 하나
      this.setVelocityX(Math.abs(dx) > 40 ? dir * this.def.spd : 0);
      if (now >= this.nextActionAt) {
        this.fire(this.x + dir * 40, this.y - this.def.height / 2, dir, 260, 480);
        this.nextActionAt = now + 2000;
      }
    } else if (this.phase === 1) {
      // 2라운드: 돌진
      if (now < this.dashUntil) return;
      if (now >= this.nextActionAt) {
        this.setVelocityX(dir * 420);
        this.dashUntil = now + 600;
        this.nextActionAt = now + 2500;
      } else {
        this.setVelocityX(0);
      }
    } else {
      // 3라운드: 제자리에서 양쪽 탄
      this.setVelocityX(0);
      if (now >= this.nextActionAt) {
        this.fire(this.x - 40, this.y - 8, -1, 300, 420);
        this.fire(this.x + 40, this.y - 8, 1, 300, 420);
        this.nextActionAt = now + 1800;
      }
    }
  }
}
