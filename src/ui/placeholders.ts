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

function tilesetTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.tiles)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // gid 1 바닥
  g.fillStyle(hex('#3b4261'), 1).fillRect(0, 0, 32, 32).lineStyle(1, hex('#565f89'), 1).strokeRect(0.5, 0.5, 31, 31);
  // gid 2 원웨이 발판 (윗면만 두껍게)
  g.fillStyle(hex('#9ece6a'), 1).fillRect(32, 0, 32, 8).fillStyle(hex('#4f6b2f'), 1).fillRect(32, 8, 32, 6);
  // gid 3 사다리
  g.fillStyle(hex('#e0af68'), 1).fillRect(64 + 6, 0, 4, 32).fillRect(64 + 22, 0, 4, 32);
  for (let y = 4; y < 32; y += 8) g.fillRect(64 + 6, y, 20, 3);
  g.generateTexture(TEX.tiles, 96, 32);
  g.destroy();
}

export function makePlaceholderTextures(scene: Phaser.Scene): void {
  tilesetTexture(scene);
  for (const m of MEMBERS) rectTexture(scene, playerTex(m.id), 32, 48, m.color, '#ffffff');
  for (const e of ENEMIES) rectTexture(scene, enemyTex(e.id), e.width, e.height, e.color);
  for (const n of NPCS) rectTexture(scene, npcTex(n.id), 32, 48, n.color);
  rectTexture(scene, TEX.portal, 32, 64, '#7dcfff', '#ffffff');
  rectTexture(scene, TEX.portalLocked, 32, 64, '#414868', '#565f89');
  rectTexture(scene, TEX.savepoint, 24, 40, '#ff9e64', '#ffffff');
  rectTexture(scene, TEX.heart, 12, 12, '#f7768e');
  rectTexture(scene, TEX.item, 16, 16, '#e0af68');
  rectTexture(scene, TEX.projectile, 14, 8, '#ffffff');
  rectTexture(scene, TEX.hit, 8, 8, '#ffffff');
}
