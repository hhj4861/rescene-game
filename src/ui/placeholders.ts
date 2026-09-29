import Phaser from 'phaser';
import { ENEMIES, MEMBERS, NPCS } from '../data/index';
import { TEX, enemyTex, npcTex, playerTex } from '../core/AssetKeys';

const hex = (h: string): number => Phaser.Display.Color.HexStringToColor(h).color;

export function rectTexture(scene: Phaser.Scene, key: string, w: number, h: number, fillHex: string, borderHex = '#1a1b26'): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(hex(fillHex), 1).fillRect(0, 0, w, h);
  g.lineStyle(2, hex(borderHex), 1).strokeRect(1, 1, w - 2, h - 2);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function makePlaceholderTextures(scene: Phaser.Scene): void {
  for (const m of MEMBERS) rectTexture(scene, playerTex(m.id), 32, 48, m.color, '#ffffff');
  for (const e of ENEMIES) rectTexture(scene, enemyTex(e.id), e.width, e.height, e.color);
  for (const n of NPCS) rectTexture(scene, npcTex(n.id), 32, 48, n.color);
  rectTexture(scene, TEX.projectile, 14, 8, '#ffffff');
  rectTexture(scene, TEX.hit, 8, 8, '#ffffff');
}
