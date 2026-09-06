import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { loadArcadeSave } from '../core/arcadeSave';
import { STAGES } from '../data/index';
import { sfx } from '../audio/audioSession';
import { SMALL_TEXT, TITLE_TEXT, UI_TEXT, style } from '../ui/textStyles';
import { GAME_WIDTH } from '../config';

export class StageSelectScene extends Phaser.Scene {
  private index = 0;
  private unlocked = 1;
  private rows: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(SCENE.stageSelect);
  }

  create(): void {
    this.index = 0;
    this.unlocked = Math.min(loadArcadeSave().unlockedStages, STAGES.length);

    this.add.text(GAME_WIDTH / 2, 70, '스테이지 셀렉트', TITLE_TEXT).setOrigin(0.5);
    this.rows = STAGES.map((s, i) => this.add.text(GAME_WIDTH / 2, 160 + i * 40, this.label(s.index, s.name, s.era), UI_TEXT).setOrigin(0.5));
    this.add.text(GAME_WIDTH / 2, 480, '↑↓ 선택   Enter 시작   Esc 뒤로', SMALL_TEXT).setOrigin(0.5);
    this.render();

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-ESC', () => this.scene.start(SCENE.title));
  }

  private label(index: number, name: string, era: string): string {
    return index > this.unlocked ? `?????? (미개방)` : `스테이지 ${index} — ${name} (${era})`;
  }

  private move(delta: number): void {
    this.index = Phaser.Math.Clamp(this.index + delta, 0, this.unlocked - 1);
    sfx(this, 'menu');
    this.render();
  }

  private render(): void {
    this.rows.forEach((r, i) => {
      const locked = i + 1 > this.unlocked;
      r.setStyle(i === this.index ? style(16, '#ffffff', { fontStyle: 'bold' }) : style(16, locked ? '#565f89' : '#c0caf5'));
      r.setText(`${i === this.index ? '▶ ' : '   '}${this.label(i + 1, STAGES[i]!.name, STAGES[i]!.era)}`);
    });
  }

  private confirm(): void {
    const stage = STAGES[this.index]!;
    if (stage.index > this.unlocked) return;
    sfx(this, 'menu');
    this.scene.start(SCENE.select, { stageIndex: stage.index });
  }
}
