import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';
import type { Enemy } from './Enemy';

export interface ProjectileSpec {
  damage: number;
  speed: number;
  range: number;
  pierce: boolean;
  /** 맞은 적에게 주는 x 넉백(방향은 진행 방향). */
  knockback?: number;
  /** 맞은 적 경직(ms). 필살기 음파용. */
  stunMs?: number;
  /** 3타·필살기 등 강한 타격(hit3 효과음). */
  strong?: boolean;
}

export class Projectile extends Phaser.Physics.Arcade.Image {
  readonly spec: ProjectileSpec;
  readonly startX: number;
  readonly hitSet = new Set<Enemy>();
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: 1 | -1, spec: ProjectileSpec) {
    super(scene, x, y, TEX.projectile);
    this.spec = spec;
    this.startX = x;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.setVelocityX(dir * spec.speed).setFlipX(dir === -1).setDepth(9);
    if (spec.strong) this.setTint(0xffd166).setScale(1.6, 1.2);
  }

  /** Image에는 preUpdate가 없지만 add.existing()이 updateList에 등록하므로 매 프레임 호출된다 */
  preUpdate(): void {
    if (Math.abs(this.x - this.startX) > this.spec.range) this.destroy();
  }
}
