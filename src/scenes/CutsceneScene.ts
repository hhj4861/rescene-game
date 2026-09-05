import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { getCutscene } from '../data/index';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { style } from '../ui/textStyles';

export interface CutsceneData {
  cutsceneId: string;
  next: { start: string; data?: object } | { resume: string };
}

export class CutsceneScene extends Phaser.Scene {
  private args!: CutsceneData;
  private lines: string[] = [];
  private index = 0;

  constructor() {
    super(SCENE.cutscene);
  }

  init(data: CutsceneData): void {
    this.args = data;
    this.index = 0;
  }

  create(): void {
    const c = getCutscene(this.args.cutsceneId);
    this.lines = c.lines;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setOrigin(0, 0);
    const title = this.add.text(GAME_WIDTH / 2, 120, c.title, style(26, '#ffd166', { fontStyle: 'bold' })).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 600 });
    this.add.text(GAME_WIDTH - 24, GAME_HEIGHT - 24, 'Enter ▶', style(11, '#a9b1d6')).setOrigin(1, 0.5);
    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', () => this.advance());
    kb.on('keydown-SPACE', () => this.advance());
    this.advance();
  }

  private advance(): void {
    if (this.index >= this.lines.length) {
      this.finish();
      return;
    }
    const t = this.add.text(GAME_WIDTH / 2, 210 + this.index * 44, this.lines[this.index]!, style(18, '#ffffff', { align: 'center', wordWrap: { width: GAME_WIDTH - 200 } })).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 500 });
    this.index += 1;
  }

  private finish(): void {
    const next = this.args.next;
    if ('resume' in next) {
      this.scene.stop();
      this.scene.resume(next.resume);
    } else {
      this.scene.start(next.start, next.data);
    }
  }
}
