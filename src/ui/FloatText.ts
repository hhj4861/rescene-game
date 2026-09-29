import type Phaser from 'phaser';
import { style } from './textStyles';

/** 짧은 월드 텍스트(위로 떠오르며 사라짐). 데미지 숫자 팝업은 v0.2에서 없앴다(스펙 §8). */
export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color = '#ffffff', size = 14): void {
  const t = scene.add.text(x, y, text, style(size, color, { stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5).setDepth(50);
  scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}
