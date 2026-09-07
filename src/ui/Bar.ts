import Phaser from 'phaser';
import { style } from './textStyles';

export class Bar {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text | null;
  private readonly ticks: Phaser.GameObjects.Rectangle[] = [];
  private readonly scene: Phaser.Scene;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fillHex: string, label = true) {
    this.scene = scene;
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.bg = scene.add.rectangle(x, y, w, h, 0x1a1b26, 0.9).setOrigin(0, 0.5).setStrokeStyle(1, 0x565f89);
    this.fill = scene.add.rectangle(x + 1, y, w - 2, h - 2, Phaser.Display.Color.HexStringToColor(fillHex).color).setOrigin(0, 0.5);
    this.text = label ? scene.add.text(x + w / 2, y, '', style(11, '#ffffff', { stroke: '#000000', strokeThickness: 2 })).setOrigin(0.5) : null;
  }

  set(ratio: number, text = ''): void {
    this.fill.width = Math.max(0, Math.min(1, ratio)) * (this.w - 2);
    this.text?.setText(text);
  }

  setFillColor(color: number): void {
    this.fill.setFillStyle(color);
  }

  /** 구분선(비율 위치, 0~1). 보스 페이즈 경계 표시용. */
  setTicks(ratios: number[]): void {
    for (const t of this.ticks) t.destroy();
    this.ticks.length = 0;
    for (const r of ratios) {
      if (r <= 0 || r >= 1) continue;
      this.ticks.push(this.scene.add.rectangle(this.x + 1 + (this.w - 2) * r, this.y, 2, this.h, 0xffffff, 0.8).setOrigin(0.5).setDepth(1));
    }
  }

  setVisible(v: boolean): void {
    this.bg.setVisible(v); this.fill.setVisible(v); this.text?.setVisible(v);
    for (const t of this.ticks) t.setVisible(v);
  }
}
