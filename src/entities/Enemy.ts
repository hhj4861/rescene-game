import Phaser from 'phaser';
import { enemyTex } from '../core/AssetKeys';
import type { EnemyDef } from '../data/schema';
import type { StatKey, Stats } from '../systems/types';
import type { Player } from './Player';

interface Dot { amount: number; ticksLeft: number; intervalMs: number; nextAt: number }

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly def: EnemyDef;
  hp: number;
  stunnedUntil = 0;
  statMods: Partial<Record<StatKey, { ratio: number; until: number }>> = {};
  dots: Dot[] = [];
  dir: 1 | -1 = -1;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef) {
    super(scene, x, y, enemyTex(def.id));
    this.def = def;
    this.hp = def.hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(8);
    this.body.setSize(Math.max(8, def.width - 4), Math.max(8, def.height - 2));
    this.setCollideWorldBounds(true);
  }

  stats(): Stats {
    const now = this.scene.time.now;
    const mod = (k: StatKey, base: number): number => {
      const m = this.statMods[k];
      return m && m.until > now ? Math.max(0, Math.round(base * (1 + m.ratio))) : base;
    };
    return { hp: this.def.hp, mp: 0, atk: mod('atk', this.def.atk), def: mod('def', this.def.def), spd: mod('spd', this.def.spd), luk: 0 };
  }

  takeHit(amount: number, knockbackX: number): boolean {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.clearTint());
    if (knockbackX !== 0) this.setVelocity(knockbackX, -120);
    return this.hp <= 0;
  }

  applyStun(until: number): void {
    this.stunnedUntil = Math.max(this.stunnedUntil, until);
  }

  applyDebuff(stat: StatKey, ratio: number, until: number): void {
    this.statMods[stat] = { ratio, until };
  }

  applyDot(amountPerTick: number, ticks: number, intervalMs: number, now: number): void {
    this.dots.push({ amount: amountPerTick, ticksLeft: ticks, intervalMs, nextAt: now + intervalMs });
  }

  /** 이번 프레임에 터진 도트 데미지 목록 */
  tickDots(now: number): number[] {
    const out: number[] = [];
    for (const d of this.dots) {
      if (now >= d.nextAt && d.ticksLeft > 0) {
        d.ticksLeft -= 1;
        d.nextAt = now + d.intervalMs;
        out.push(d.amount);
      }
    }
    this.dots = this.dots.filter((d) => d.ticksLeft > 0);
    return out;
  }

  updateAi(player: Player, now: number, hasFloor: (x: number, y: number) => boolean): void {
    if (now < this.stunnedUntil) {
      this.setVelocityX(0);
      return;
    }
    const spd = this.stats().spd;
    const dx = player.x - this.x;
    if (this.def.ai === 'chase' && Math.abs(dx) < 280 && Math.abs(player.y - this.y) < 80) {
      this.dir = dx < 0 ? -1 : 1;
    } else if (this.body.blocked.down) {
      if (this.body.blocked.left) this.dir = 1;
      else if (this.body.blocked.right) this.dir = -1;
      else if (!hasFloor(this.x + this.dir * (this.def.width / 2 + 6), this.y + 4)) this.dir = this.dir === 1 ? -1 : 1;
    }
    this.setVelocityX(this.dir * spd);
    this.setFlipX(this.dir === 1);
  }
}
