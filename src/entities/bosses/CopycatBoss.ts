import { Boss } from '../Boss';
import type { Player } from '../Player';

const COPY_DELAY_MS = 400;
const COPY_DELAY_PHASE3_MS = 200;
const COPY_DASH_MS = 300;
const COPY_DASH_SPEED = 380;
const STAGGER_MS = 3000;
const STAGGER_DAMAGE_MULT = 2;
const STAGGER_TINT = 0xffd166;

type AttackKind = 'melee' | 'projectile';

/**
 * 카피캣 대장(`copycat`): 중속 추적. 플레이어의 기본 공격을 0.4초 뒤에 따라 한다 — 원거리면 탄 1발,
 * 근접이면 300ms 대시. 필살기를 맞으면 3초 경직(이동 0, 받는 피해 ×2). 페이즈 3은 카피 지연 0.2초.
 */
export class CopycatBoss extends Boss {
  /** 마지막 공격만 복사한다(연타를 전부 따라 하지 않는다). */
  private pendingCopy: { kind: AttackKind; at: number } | null = null;
  private staggerUntil = 0;
  private wasStaggered = false;

  private get staggered(): boolean {
    return this.scene.time.now < this.staggerUntil;
  }

  protected override restoreTint(): void {
    if (this.staggered) this.setTint(STAGGER_TINT);
    else this.clearTint();
  }

  override notifyPlayerAttack(kind: AttackKind): void {
    if (this.staggered) return;
    const delay = this.phase >= 2 ? COPY_DELAY_PHASE3_MS : COPY_DELAY_MS;
    this.pendingCopy = { kind, at: this.scene.time.now + delay };
  }

  override notifySuper(): void {
    this.staggerUntil = this.scene.time.now + STAGGER_MS;
    this.pendingCopy = null;
    this.dashUntil = 0;
    this.setVelocityX(0);
    this.syncTint();
  }

  override takeHit(amount: number): boolean {
    return super.takeHit(this.staggered ? amount * STAGGER_DAMAGE_MULT : amount);
  }

  private syncTint(): void {
    const staggered = this.staggered;
    if (staggered === this.wasStaggered) return;
    this.wasStaggered = staggered;
    this.restoreTint();
  }

  protected override act(player: Player, now: number): void {
    this.syncTint();
    if (this.staggered) {
      this.setVelocityX(0);
      this.playAnim('idle');
      return;
    }
    this.playAnim('move');
    const copy = this.pendingCopy;
    if (copy && now >= copy.at) {
      this.pendingCopy = null;
      const dir = this.dirTo(player);
      this.setFlipX(dir === 1);
      if (copy.kind === 'projectile') {
        this.fireForward(dir, 340, 520);
      } else {
        this.setVelocityX(dir * COPY_DASH_SPEED);
        this.dashUntil = now + COPY_DASH_MS;
      }
    }
    if (now < this.dashUntil) return;
    this.chase(player, this.def.spd, 48);
  }
}
