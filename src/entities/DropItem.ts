import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';

export class DropItem extends Phaser.Physics.Arcade.Image {
  readonly kind: 'hearts' | 'item';
  readonly amount: number;
  readonly itemId: string | undefined;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: 'hearts' | 'item', amount: number, itemId?: string) {
    super(scene, x, y, kind === 'hearts' ? TEX.heart : TEX.item);
    this.kind = kind;
    this.amount = amount;
    this.itemId = itemId;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(7);
    this.body.setBounce(0.4, 0.4).setDrag(200, 0);
    this.setVelocity(Phaser.Math.Between(-80, 80), -220);
  }
}
