import Phaser from 'phaser';
import { style } from './textStyles';

export class Bar {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text | null;
  private readonly w: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fillHex: string, label = true) {
    this.w = w;
    this.bg = scene.add.rectangle(x, y, w, h, 0x1a1b26, 0.9).setOrigin(0, 0.5).setStrokeStyle(1, 0x565f89);
    this.fill = scene.add.rectangle(x + 1, y, w - 2, h - 2, Phaser.Display.Color.HexStringToColor(fillHex).color).setOrigin(0, 0.5);
    this.text = label ? scene.add.text(x + w / 2, y, '', style(11, '#ffffff', { stroke: '#000000', strokeThickness: 2 })).setOrigin(0.5) : null;
  }

  set(ratio: number, text = ''): void {
    this.fill.width = Math.max(0, Math.min(1, ratio)) * (this.w - 2);
    this.text?.setText(text);
  }

  setVisible(v: boolean): void {
    this.bg.setVisible(v); this.fill.setVisible(v); this.text?.setVisible(v);
  }
}
