import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';
import type { SkillDef } from '../data/schema';
import type { Enemy } from './Enemy';

export class Projectile extends Phaser.Physics.Arcade.Image {
  readonly skill: SkillDef;
  readonly pierce: boolean;
  readonly range: number;
  readonly startX: number;
  readonly hitSet = new Set<Enemy>();
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: 1 | -1, skill: SkillDef, speed: number, range: number, pierce: boolean) {
    super(scene, x, y, TEX.projectile);
    this.skill = skill;
    this.pierce = pierce;
    this.range = range;
    this.startX = x;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.setVelocityX(dir * speed).setFlipX(dir === -1).setDepth(9);
  }

  /** Image에는 preUpdate가 없지만 add.existing()이 updateList에 등록하므로 매 프레임 호출된다 */
  preUpdate(): void {
    if (Math.abs(this.x - this.startX) > this.range) this.destroy();
  }
}
