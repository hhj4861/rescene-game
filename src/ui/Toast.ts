import type Phaser from 'phaser';
import { style } from './textStyles';

export class ToastQueue {
  private items: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly x: number, private readonly y: number) {}

  push(text: string, color = '#ffffff'): void {
    const t = this.scene.add.text(this.x, this.y, text, style(15, color, { stroke: '#000000', strokeThickness: 3, fontStyle: 'bold' })).setOrigin(0.5, 0).setDepth(200);
    this.items.push(t);
    if (this.items.length > 4) this.items.shift()?.destroy();
    this.layout();
    this.scene.time.delayedCall(2200, () => {
      this.items = this.items.filter((i) => i !== t);
      this.scene.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() });
      this.layout();
    });
  }

  private layout(): void {
    this.items.forEach((t, i) => t.setY(this.y + i * 22));
  }
}
