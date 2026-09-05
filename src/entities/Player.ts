import Phaser from 'phaser';
import { playerTex } from '../core/AssetKeys';
import { stepMovement, type MoveConfig, type MoveInput, type MoveState } from '../systems/movement';
import type { MemberId } from '../systems/types';

export class Player extends Phaser.Physics.Arcade.Sprite {
  moveState: MoveState = { onGround: false, onLadder: false, climbing: false, jumpsLeft: 0, facing: 1 };
  dropThroughUntil = 0;
  invulnerableUntil = 0;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, member: MemberId) {
    super(scene, x, y, playerTex(member));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setSize(28, 46).setOffset(2, 2);
    this.setCollideWorldBounds(true);
    this.setDepth(10);
  }

  get facing(): 1 | -1 {
    return this.moveState.facing;
  }

  get onGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  applyMovement(input: MoveInput, onLadder: boolean, ladderCenterX: number | null, cfg: MoveConfig): void {
    const r = stepMovement(input, { ...this.moveState, onGround: this.onGround, onLadder }, cfg);
    this.moveState = { onGround: this.onGround, onLadder, climbing: r.climbing, jumpsLeft: r.jumpsLeft, facing: r.facing };
    this.body.setAllowGravity(r.gravity);
    this.setVelocityX(r.vx);
    if (r.vy !== null) this.setVelocityY(r.vy);
    if (r.climbing && ladderCenterX !== null) this.x = ladderCenterX;
    if (r.dropThrough) this.dropThroughUntil = this.scene.time.now + 250;
    this.setFlipX(r.facing === -1);
  }
}
