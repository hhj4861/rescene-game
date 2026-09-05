import { Enemy } from './Enemy';
import type { Player } from './Player';

const PHASE_NAMES = ['', '1라운드: 보컬', '2라운드: 댄스', '3라운드: 랩'];

export class Boss extends Enemy {
  phase: 1 | 2 | 3 = 1;
  onPhaseChange: (phase: number, name: string) => void = () => {};
  fire: (x: number, y: number, dir: 1 | -1, speed: number, range: number, multiplier: number) => void = () => {};
  private nextActionAt = 0;
  private dashUntil = 0;

  override takeHit(amount: number): boolean {
    return super.takeHit(amount, 0);
  }

  override updateAi(player: Player, now: number): void {
    const ratio = this.hp / this.def.hp;
    const target: 1 | 2 | 3 = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    if (target !== this.phase) {
      this.phase = target;
      this.invulnerableUntil = now + 800;
      this.nextActionAt = now + 800;
      this.setVelocityX(0);
      this.onPhaseChange(target, PHASE_NAMES[target]!);
      return;
    }
    if (now < this.stunnedUntil) { this.setVelocityX(0); return; }
    const dx = player.x - this.x;
    const dir: 1 | -1 = dx < 0 ? -1 : 1;
    this.setFlipX(dir === 1);

    if (this.phase === 1) {
      this.setVelocityX(Math.abs(dx) > 40 ? dir * this.stats().spd : 0);
      if (now >= this.nextActionAt) {
        this.fire(this.x + dir * 40, this.y - this.def.height / 2, dir, 260, 480, 1.2);
        this.nextActionAt = now + 2000;
      }
    } else if (this.phase === 2) {
      if (now < this.dashUntil) return;
      if (now >= this.nextActionAt) {
        this.setVelocityX(dir * 420);
        this.dashUntil = now + 600;
        this.nextActionAt = now + 2500;
      } else {
        this.setVelocityX(0);
      }
    } else {
      this.setVelocityX(0);
      if (now >= this.nextActionAt) {
        this.fire(this.x - 40, this.y - 8, -1, 300, 420, 1.0);
        this.fire(this.x + 40, this.y - 8, 1, 300, 420, 1.0);
        this.nextActionAt = now + 1800;
      }
    }
  }
}
