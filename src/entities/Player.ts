import Phaser from 'phaser';
import { playerTex } from '../core/AssetKeys';
import { PLAYER_BODY, playerAnimKey, type Outfit, type PlayerAnim } from '../core/spriteFrames';
import { stepMovement, type MoveConfig, type MoveInput, type MoveState } from '../systems/movement';
import { HURT_LINE_MS, IDLE_START, attackAnimFor, nextIdleAnim, superFlipX, type ChainStep, type IdleAnimState } from '../systems/playerAnim';
import type { MemberId } from '../systems/types';
import { style } from '../ui/textStyles';

const ATTACK_MS = 200;
const HURT_MS = 300;
const BUBBLE_Y = 76;

/** 이동 애니를 덮는 잠금: 필살기 포즈(SuperFx 동안) · 승리 포즈(스테이지 클리어 뒤). */
type AnimLock = 'super' | 'win';

export class Player extends Phaser.Physics.Arcade.Sprite {
  moveState: MoveState = { onGround: false, onLadder: false, climbing: false, jumpsLeft: 0, facing: 1 };
  dropThroughUntil = 0;
  invulnerableUntil = 0;
  declare body: Phaser.Physics.Arcade.Body;
  readonly member: MemberId;
  readonly outfit: Outfit;
  private action: PlayerAnim | null = null;
  private actionUntil = 0;
  private lock: AnimLock | null = null;
  private superSince: number | null = null;
  private idle: IdleAnimState = IDLE_START;
  private bubble: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, member: MemberId, outfit: Outfit = 'training') {
    super(scene, x, y, playerTex(member, outfit));
    this.member = member;
    this.outfit = outfit;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setSize(PLAYER_BODY.width, PLAYER_BODY.height).setOffset(PLAYER_BODY.offsetX, PLAYER_BODY.offsetY);
    this.setCollideWorldBounds(true);
    this.setDepth(10);
    this.anims.play(this.key('idle'), true);
  }

  private key(anim: PlayerAnim): string {
    return playerAnimKey(this.member, anim, this.outfit);
  }

  /** 체인 1·2·3타 프레임(attack1/2/3)을 200ms 동안 이동 애니 위에 덮는다. */
  playAttack(step: ChainStep = 1): void {
    this.startAction(attackAnimFor(step), ATTACK_MS);
  }

  /** 피격 모션: 300ms 동안 눈 감은 프레임. */
  playHurt(): void {
    this.startAction('hurt', HURT_MS);
  }

  /** 필살기 포즈 2프레임 루프. 제나는 preUpdate 에서 120ms 마다 좌우 반전(까엉턴). stopSuper 로 푼다. */
  playSuper(): void {
    this.lock = 'super';
    this.superSince = this.scene.time.now;
    this.action = null;
    this.idle = IDLE_START;
    this.anims.play(this.key('super'), true);
  }

  /** SuperFx 종료: 반전을 원래 방향으로 돌리고 idle 로. */
  stopSuper(): void {
    if (this.lock !== 'super') return;
    this.lock = null;
    this.superSince = null;
    this.setFlipX(this.facing === -1);
    this.anims.play(this.key('idle'), true);
  }

  /** 승리 포즈 고정(스테이지 클리어 연출·결과 화면). 이후 이동 애니로 돌아가지 않는다. */
  playWin(): void {
    this.lock = 'win';
    this.superSince = null;
    this.action = null;
    this.setFlipX(this.facing === -1);
    this.anims.play(this.key('win'), true);
  }

  /** 머리 위 말풍선(CheerNpc 와 같은 스타일). 플레이어를 따라다니고 ms 뒤 사라진다. */
  say(text: string, ms = HURT_LINE_MS): void {
    this.bubble?.destroy();
    const bubble = this.scene.add.text(this.x, this.y - BUBBLE_Y, text, style(12, '#1a1b26', {
      backgroundColor: '#ffffff', padding: { x: 6, y: 3 }, align: 'center', wordWrap: { width: 220 },
    })).setOrigin(0.5, 1).setDepth(11);
    this.bubble = bubble;
    this.scene.time.delayedCall(ms, () => {
      if (this.bubble === bubble) this.bubble = null;
      bubble.destroy();
    });
  }

  private startAction(anim: PlayerAnim, ms: number): void {
    if (this.lock) return;
    this.action = anim;
    this.actionUntil = this.scene.time.now + ms;
    this.idle = IDLE_START;
    this.anims.play(this.key(anim), true);
  }

  private updateAnimation(vx: number, climbing: boolean, hasInput: boolean): void {
    if (this.lock) return;
    if (this.action && this.scene.time.now < this.actionUntil) return;
    this.action = null;
    const resting = this.onGround && vx === 0 && !climbing && !hasInput;
    const r = nextIdleAnim(this.idle, this.scene.game.loop.delta, resting);
    this.idle = r.state;
    const anim: PlayerAnim = r.anim ?? (climbing ? 'idle' : !this.onGround ? 'jump' : vx !== 0 ? 'walk' : 'idle');
    this.anims.play(this.key(anim), true);
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
    if (this.superSince === null) this.setFlipX(r.facing === -1);
    const hasInput = input.left || input.right || input.up || input.down || input.jumpPressed;
    this.updateAnimation(r.vx, r.climbing, hasInput);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.superSince !== null) this.setFlipX(superFlipX(this.member, this.scene.time.now - this.superSince, this.facing));
    this.bubble?.setPosition(this.x, this.y - BUBBLE_Y);
  }

  destroy(fromScene?: boolean): void {
    this.bubble?.destroy();
    this.bubble = null;
    super.destroy(fromScene);
  }
}
