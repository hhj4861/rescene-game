import type Phaser from 'phaser';
import type { EnemyDef } from '../../data/schema';
import { Boss } from '../Boss';
import type { Player } from '../Player';

const SUMMON_INTERVAL_MS = 6000;
const FIRST_SUMMON_MS = 1500;
const SUMMON_DX = 120;
const MAX_MINIONS = 4;
const KILLS_TO_EXPOSE = 3;
const EXPOSE_MS = 8000;
const WAVE_INTERVAL_MS = 3000;
const EXPOSED_TINT = 0xf7768e;
const CLOSED_TINT = 0x565f89;

/**
 * 침묵(`silence`): 제자리에서 불사. 6초마다 `def.minion`(무관심 안개) 2마리를 부르고(동시 최대 4),
 * 그 잡몹을 3마리 잡으면 8초 동안 약점이 드러나 피해가 들어간다. 3초마다 양방향 충격파.
 */
export class SilenceBoss extends Boss {
  private kills = 0;
  private exposedUntil = 0;
  private nextSummonAt: number;
  private wasExposed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef) {
    super(scene, x, y, def);
    this.nextSummonAt = scene.time.now + FIRST_SUMMON_MS;
    this.nextActionAt = scene.time.now + WAVE_INTERVAL_MS;
    this.restoreTint();
  }

  private get isExposed(): boolean {
    return this.scene.time.now < this.exposedUntil;
  }

  override get invulnerable(): boolean {
    return !this.isExposed;
  }

  override get exposed(): boolean {
    return this.isExposed;
  }

  protected override restoreTint(): void {
    this.setTint(this.isExposed ? EXPOSED_TINT : CLOSED_TINT);
  }

  override notifyMinionKilled(enemyId: string): void {
    if (enemyId !== this.def.minion || this.isExposed) return;
    this.kills += 1;
    if (this.kills < KILLS_TO_EXPOSE) return;
    this.kills = 0;
    this.exposedUntil = this.scene.time.now + EXPOSE_MS;
    this.syncTint();
  }

  private syncTint(): void {
    const exposed = this.isExposed;
    if (exposed === this.wasExposed) return;
    this.wasExposed = exposed;
    this.restoreTint();
  }

  protected override act(player: Player, now: number): void {
    this.syncTint();
    this.setVelocityX(0);
    this.setFlipX(this.dirTo(player) === 1);
    this.playAnim(this.isExposed ? 'idle' : 'move');
    if (this.def.minion && now >= this.nextSummonAt) {
      this.nextSummonAt = now + SUMMON_INTERVAL_MS;
      for (const dx of [-SUMMON_DX, SUMMON_DX]) {
        if (this.minionsAlive >= MAX_MINIONS) break;
        this.spawnMinion(this.def.minion, this.x + dx, this.y);
      }
    }
    if (now < this.nextActionAt) return;
    this.fireBothWays(280, 460);
    this.nextActionAt = now + WAVE_INTERVAL_MS;
  }
}
