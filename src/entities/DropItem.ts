import Phaser from 'phaser';
import { TEX2, heartTex } from '../core/ArcadeAssetKeys';
import type { MemberId } from '../systems/types';

/** 바닥에 떨어지는 아이템: 하트(멤버 시그니처 음식)·유행어 카드. */
export type Drop = { kind: 'heart'; member: MemberId } | { kind: 'card'; memeId: string };

export class DropItem extends Phaser.Physics.Arcade.Sprite {
  readonly drop: Drop;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, drop: Drop) {
    const tex = drop.kind === 'heart' ? heartTex(drop.member) : TEX2.card;
    super(scene, x, y, tex);
    this.drop = drop;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(7);
    this.body.setBounce(0.4, 0.4).setDrag(200, 0);
    this.setCollideWorldBounds(true);
    this.setVelocity(Phaser.Math.Between(-80, 80), -220);
    this.anims.play(`${tex}_anim`, true);
  }
}
