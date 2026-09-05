import type Phaser from 'phaser';

export const FONT = 'sans-serif';

export function style(size: number, color = '#c0caf5', extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT, fontSize: `${size}px`, color, ...extra };
}

export const TITLE_TEXT = style(40, '#ffffff', { fontStyle: 'bold' });
export const UI_TEXT = style(16);
export const SMALL_TEXT = style(12, '#a9b1d6');
