import Phaser from 'phaser';
import { playerTex } from '../core/AssetKeys';
import { PLAYER_BODY, playerAnimKey, type PlayerAnim } from '../core/spriteFrames';
import { stepMovement, type MoveConfig, type MoveInput, type MoveState } from '../systems/movement';
import type { MemberId } from '../systems/types';

export class Player extends Phaser.Physics.Arcade.Sprite {
  moveState: MoveState = { onGround: false, onLadder: false, climbing: false, jumpsLeft: 0, facing: 1 };
  dropThroughUntil = 0;
  invulnerableUntil = 0;
  declare body: Phaser.Physics.Arcade.Body;
  private readonly member: MemberId;
  private action: PlayerAnim | null = null;
  private actionUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, member: MemberId) {
    super(scene, x, y, playerTex(member));
    this.member = member;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setSize(PLAYER_BODY.width, PLAYER_BODY.height).setOffset(PLAYER_BODY.offsetX, PLAYER_BODY.offsetY);
    this.setCollideWorldBounds(true);
    this.setDepth(10);
    this.anims.play(playerAnimKey(member, 'idle'), true);
  }

  /** 공격 모션: 200ms 동안 이동 애니메이션을 덮는다. */
  playAttack(): void {
    this.startAction('attack', 200);
  }

  /** 피격 모션: 300ms 동안 눈 감은 프레임. */
  playHurt(): void {
    this.startAction('hurt', 300);
  }

  private startAction(anim: PlayerAnim, ms: number): void {
    this.action = anim;
    this.actionUntil = this.scene.time.now + ms;
    this.anims.play(playerAnimKey(this.member, anim), true);
  }

  private updateAnimation(vx: number, climbing: boolean): void {
    if (this.action && this.scene.time.now < this.actionUntil) return;
    this.action = null;
    const anim: PlayerAnim = climbing ? 'idle' : !this.onGround ? 'jump' : vx !== 0 ? 'walk' : 'idle';
    this.anims.play(playerAnimKey(this.member, anim), true);
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
    this.updateAnimation(r.vx, r.climbing);
  }
}
