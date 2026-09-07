import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';

/**
 * 점프대 시트 키. P2(sprites-2)가 `TEX2.jumppad = 'obj_jumppad'` 로 추가한다 — 이 파일은 P2 머지 전에도
 * 컴파일·동작해야 하므로 문자열 상수를 따로 두고, 텍스처가 없으면 8×8 타격 스파크를 늘려 쓴다.
 */
export const JUMPPAD_TEX = 'obj_jumppad';
export const JUMPPAD_ANIM = `${JUMPPAD_TEX}_anim`;
export const JUMPPAD_VELOCITY = -900;
export const JUMPPAD_COOLDOWN_MS = 300;
const PAD_W = 32;
const PAD_H = 16;

/** 밈의 파도(스테이지 4) 점프대. 맵 `jumppad` 오브젝트 자리에 놓이는 정적 바디. 위에서 밟으면 튕겨 올린다. */
export class JumpPad extends Phaser.Physics.Arcade.Sprite {
  /** 이 시각 전에는 다시 발동하지 않는다(0.3초 재발동 금지). */
  readyAt = 0;
  declare body: Phaser.Physics.Arcade.StaticBody;

  /** x 는 중심, y 는 바닥(발 위치) — 맵 오브젝트 박스의 아래 변 가운데. */
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const hasSheet = scene.textures.exists(JUMPPAD_TEX);
    super(scene, x, y, hasSheet ? JUMPPAD_TEX : TEX.hit, 0);
    this.setOrigin(0.5, 1).setDepth(6);
    if (!hasSheet) this.setDisplaySize(PAD_W, PAD_H).setTint(0x7dcfff);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    if (hasSheet && scene.anims.exists(JUMPPAD_ANIM)) this.anims.play(JUMPPAD_ANIM, true);
  }

  /**
   * 플레이어가 위에서 닿았을 때 튕긴다. 아래에서 올라오는 중(vy<0)이거나 발이 점프대보다 낮으면 무시.
   * 발동했으면 true(씬이 효과음을 낸다).
   */
  launch(player: Phaser.Physics.Arcade.Sprite, now: number): boolean {
    if (now < this.readyAt) return false;
    const pb = player.body as Phaser.Physics.Arcade.Body;
    if (pb.velocity.y < 0 || pb.bottom > this.body.bottom + 4) return false;
    this.readyAt = now + JUMPPAD_COOLDOWN_MS;
    player.setVelocityY(JUMPPAD_VELOCITY);
    this.scene.tweens.add({ targets: this, scaleY: 0.5, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
    return true;
  }
}
