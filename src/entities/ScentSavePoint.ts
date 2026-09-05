import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';
import type { MapObject } from '../scenes/worldObjects';

export class ScentSavePoint extends Phaser.Physics.Arcade.Image {
  readonly saveName: string;

  constructor(scene: Phaser.Scene, obj: MapObject) {
    super(scene, obj.x, obj.y, TEX.savepoint);
    this.saveName = obj.name;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1).setDepth(5);
    scene.tweens.add({ targets: this, alpha: 0.6, yoyo: true, repeat: -1, duration: 900 });
  }
}
