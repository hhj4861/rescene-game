import Phaser from 'phaser';
import { TEX2 } from '../core/ArcadeAssetKeys';

/** 구간 클리어 보상 상자. 프레임 0 닫힘 · 1 열림. 닿으면 한 번만 열린다. */
export class Chest extends Phaser.Physics.Arcade.Sprite {
  opened = false;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX2.chest, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(7);
    // collideWorldBounds 는 켜지 않는다(DropItem 과 같은 이유).
    this.body.setBounce(0.2, 0.2).setDrag(300, 0);
    this.setVelocityY(-160);
  }

  /** 열렸으면 true(첫 호출만). */
  open(): boolean {
    if (this.opened) return false;
    this.opened = true;
    this.setFrame(1);
    this.scene.tweens.add({ targets: this, scaleX: 1.25, scaleY: 0.8, duration: 90, yoyo: true });
    return true;
  }
}
