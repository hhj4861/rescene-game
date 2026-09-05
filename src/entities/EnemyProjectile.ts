import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';
import type { Stats } from '../systems/types';

export class EnemyProjectile extends Phaser.Physics.Arcade.Image {
  readonly attacker: Stats;
  readonly multiplier: number;
  readonly range: number;
  readonly startX: number;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: 1 | -1, speed: number, range: number, attacker: Stats, multiplier: number) {
    super(scene, x, y, TEX.projectile);
    this.attacker = attacker;
    this.multiplier = multiplier;
    this.range = range;
    this.startX = x;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.setTint(0xbb9af7).setVelocityX(dir * speed).setDepth(9);
  }

  preUpdate(): void {
    if (Math.abs(this.x - this.startX) > this.range) this.destroy();
  }
}
