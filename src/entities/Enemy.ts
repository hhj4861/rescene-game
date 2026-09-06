import Phaser from 'phaser';
import { enemyTex } from '../core/AssetKeys';
import { enemyAnimKey, type EnemyAnim } from '../core/spriteFrames';
import type { EnemyDef } from '../data/schema';
import type { Player } from './Player';

interface Dot { amount: number; ticksLeft: number; intervalMs: number; nextAt: number }

export const ELITE_TINT = 0xffd166;
export const ELITE_HP_MULT = 3;
export const DEFAULT_ELITE_SCALE = 1.5;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly def: EnemyDef;
  hp: number;
  maxHp: number;
  elite = false;
  stunnedUntil = 0;
  invulnerableUntil = 0;
  dots: Dot[] = [];
  dir: 1 | -1 = -1;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef) {
    super(scene, x, y, enemyTex(def.id));
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(8);
    this.body.setSize(Math.max(8, def.width - 4), Math.max(8, def.height - 2));
    this.setCollideWorldBounds(true);
    // static(무반응 관객·무대 트랩): 제자리에서 접촉 피해만 준다. 밀리지도 않는다.
    if (def.ai === 'static') this.body.setImmovable(true);
    this.playAnim(def.ai === 'static' ? 'idle' : 'move');
  }

  /** 제자리 적(ai: 'static'). 이동·넉백이 없다. */
  get isStatic(): boolean {
    return this.def.ai === 'static';
  }

  /** 엘리트: 큰 크기·금색 틴트·체력 ×3. 바디는 Arcade 가 스케일에 맞춰 자동으로 키운다. */
  makeElite(): this {
    this.elite = true;
    this.setScale(this.def.eliteScale ?? DEFAULT_ELITE_SCALE);
    this.maxHp = this.def.hp * ELITE_HP_MULT;
    this.hp = this.maxHp;
    this.restoreTint();
    return this;
  }

  protected playAnim(anim: EnemyAnim): void {
    this.anims.play(enemyAnimKey(this.def.id, anim), true);
  }

  private restoreTint(): void {
    if (this.elite) this.setTint(ELITE_TINT);
    else this.clearTint();
  }

  /** 피해를 입힌다. 죽었으면 true. */
  takeHit(amount: number, knockbackX: number): boolean {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => { if (this.active) this.restoreTint(); });
    if (knockbackX !== 0 && !this.isStatic) this.setVelocity(knockbackX, -120);
    return this.hp <= 0;
  }

  applyStun(until: number): void {
    this.stunnedUntil = Math.max(this.stunnedUntil, until);
  }

  applyDot(amountPerTick: number, ticks: number, intervalMs: number, now: number): void {
    this.dots.push({ amount: amountPerTick, ticksLeft: ticks, intervalMs, nextAt: now + intervalMs });
  }

  /** 이번 프레임에 터진 지속 피해 목록 */
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
    if (this.isStatic || now < this.stunnedUntil) {
      this.setVelocityX(0);
      this.playAnim('idle');
      return;
    }
    this.playAnim('move');
    const spd = this.def.spd;
    const dx = player.x - this.x;
    if (this.def.ai === 'chase' && Math.abs(dx) < 280 && Math.abs(player.y - this.y) < 80) {
      this.dir = dx < 0 ? -1 : 1;
    } else if (this.body.blocked.down) {
      if (this.body.blocked.left) this.dir = 1;
      else if (this.body.blocked.right) this.dir = -1;
      else if (!hasFloor(this.x + this.dir * (this.displayWidth / 2 + 6), this.y + 4)) this.dir = this.dir === 1 ? -1 : 1;
    }
    this.setVelocityX(this.dir * spd);
    this.setFlipX(this.dir === 1);
  }
}
