import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { getMember } from '../data/index';
import { NPC_VOICE } from '../data/voice';
import { getRun, hasRun } from '../core/runSession';
import { speakAs } from '../audio/audioSession';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { style } from '../ui/textStyles';

export interface CutsceneData {
  lines: string[];
  voice?: 'member' | 'npc';
  next: { start: string; data?: object };
}

export class CutsceneScene extends Phaser.Scene {
  private args!: CutsceneData;
  private lines: string[] = [];
  private index = 0;
  private finished = false;

  constructor() {
    super(SCENE.cutscene);
  }

  init(data: CutsceneData): void {
    this.args = data;
    this.index = 0;
    this.finished = false;
  }

  create(): void {
    this.lines = this.args.lines;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setOrigin(0, 0);
    this.add.text(GAME_WIDTH - 24, GAME_HEIGHT - 24, 'Enter ▶', style(11, '#a9b1d6')).setOrigin(1, 0.5);
    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', () => this.advance());
    kb.on('keydown-SPACE', () => this.advance());
    this.advance();
  }

  private voiceProfile(): typeof NPC_VOICE {
    if (this.args.voice === 'member' && hasRun(this)) {
      return getMember(getRun(this).state.member).voice;
    }
    return NPC_VOICE;
  }

  private advance(): void {
    if (this.finished) return;
    if (this.index >= this.lines.length) {
      this.finish();
      return;
    }
    const line = this.lines[this.index]!;
    const t = this.add.text(GAME_WIDTH / 2, 210 + this.index * 44, line, style(18, '#ffffff', { align: 'center', wordWrap: { width: GAME_WIDTH - 200 } })).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 500 });
    speakAs(this, line, this.voiceProfile());
    this.index += 1;
  }

  private finish(): void {
    this.finished = true;
    const next = this.args.next;
    this.scene.start(next.start, next.data);
  }
}
