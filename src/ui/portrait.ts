import Phaser from 'phaser';
import { portraitTex } from '../core/AssetKeys';
import type { MemberId } from '../systems/types';

/** 초상화 프레임: 0 기본 · 1 시그니처 · 2 피격 (tools/sprites/portraits.ts 와 동일). */
export type PortraitFrame = 0 | 1 | 2;

const PANEL_FILL = 0x2f3450;

/**
 * 밝은 백판 + 멤버색 테두리 위에 초상화를 올린 컨테이너.
 * 검은 머리 외곽선이 게임 배경과 명도가 비슷해 백판 없이는 실루엣이 묻힌다.
 */
export function addPortrait(scene: Phaser.Scene, x: number, y: number, member: MemberId, frame: PortraitFrame, scale: number, colorHex: string): Phaser.GameObjects.Container & { portrait: Phaser.GameObjects.Image } {
  const size = 64 * scale + 8 * scale;
  const tint = Phaser.Display.Color.HexStringToColor(colorHex).color;
  const panel = scene.add.rectangle(0, 0, size, size, PANEL_FILL, 0.95).setStrokeStyle(Math.max(2, scale), tint, 0.9);
  const portrait = scene.add.image(0, 0, portraitTex(member), frame).setScale(scale);
  const c = scene.add.container(x, y, [panel, portrait]) as Phaser.GameObjects.Container & { portrait: Phaser.GameObjects.Image };
  c.portrait = portrait;
  return c;
}
