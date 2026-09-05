import type Phaser from 'phaser';
import { style } from './textStyles';

export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color = '#ffffff', size = 14): void {
  const t = scene.add.text(x, y, text, style(size, color, { stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5).setDepth(50);
  scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}

export function damagePopup(scene: Phaser.Scene, x: number, y: number, amount: number, crit: boolean, hostile = false): void {
  const color = hostile ? '#f7768e' : crit ? '#ffd166' : '#ffffff';
  floatText(scene, x + jitter(-8, 8), y, crit ? `${amount}!` : String(amount), color, crit ? 18 : 14);
}

function jitter(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
