import type Phaser from 'phaser';
import type { EnemyDef } from '../../data/schema';
import { Boss } from '../Boss';
import type { Player } from '../Player';

const CHAINS_TO_OPEN = 3;
const LENS_OPEN_MS = 5000;
const SHOT_INTERVAL_MS = 2500;
const CLOSED_TINT = 0x565f89;

/**
 * 첫 카메라(`lens`): 렌즈가 닫혀 있으면 불사. 플레이어가 3타 체인을 3번 끝내면 5초 동안 렌즈가 열려
 * 피해가 들어간다. 느리게 추적하며 2.5초마다 플래시 탄 1발(페이즈 2부터 2발).
 */
export class LensBoss extends Boss {
  private chains = 0;
  private openUntil = 0;
  private wasOpen = false;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef) {
    super(scene, x, y, def);
    this.restoreTint();
  }

  private get lensOpen(): boolean {
    return this.scene.time.now < this.openUntil;
  }

  override get invulnerable(): boolean {
    return !this.lensOpen;
  }

  override get exposed(): boolean {
    return this.lensOpen;
  }

  protected override restoreTint(): void {
    if (this.lensOpen) this.clearTint();
    else this.setTint(CLOSED_TINT);
  }

  override notifyChainFinished(): void {
    if (this.lensOpen) return;
    this.chains += 1;
    if (this.chains < CHAINS_TO_OPEN) return;
    this.chains = 0;
    this.openUntil = this.scene.time.now + LENS_OPEN_MS;
    this.syncTint();
  }

  /** 열림/닫힘이 바뀐 프레임에만 틴트를 다시 칠한다(피격 플래시와 겹치지 않게). */
  private syncTint(): void {
    const open = this.lensOpen;
    if (open === this.wasOpen) return;
    this.wasOpen = open;
    this.restoreTint();
  }

  protected override act(player: Player, now: number): void {
    this.syncTint();
    this.playAnim(this.lensOpen ? 'move' : 'idle');
    this.chase(player, this.def.spd, 60);
    if (now < this.nextActionAt) return;
    const dir = this.dirTo(player);
    this.fireForward(dir, 320, 520);
    if (this.phase >= 1) this.fire(this.x + dir * 40, this.y - this.def.height / 2 - 28, dir, 250, 520);
    this.nextActionAt = now + SHOT_INTERVAL_MS;
  }
}
