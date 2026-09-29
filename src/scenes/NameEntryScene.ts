import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { loadArcadeSave, persistArcadeSave } from '../core/arcadeSave';
import { insertScore, sanitizeInitials, type HighscoreEntry } from '../systems/highscore';
import type { MemberId } from '../systems/types';
import { sfx } from '../audio/audioSession';
import { SMALL_TEXT, TITLE_TEXT, UI_TEXT, style } from '../ui/textStyles';
import { GAME_WIDTH } from '../config';

export interface NameEntryData {
  score: number;
  member: MemberId;
  stageReached: number;
}

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.'.split('');
const SLOTS = 3;

export class NameEntryScene extends Phaser.Scene {
  private args!: NameEntryData;
  private letters: number[] = [0, 0, 0];
  private cursor = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private navigating = false;

  constructor() {
    super(SCENE.nameEntry);
  }

  init(data: NameEntryData): void {
    this.args = data;
    this.letters = [0, 0, 0];
    this.cursor = 0;
    this.navigating = false;
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 120, 'NEW RECORD!', TITLE_TEXT).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 172, `점수 ${String(this.args.score).padStart(7, '0')}`, UI_TEXT).setOrigin(0.5);
    const startX = GAME_WIDTH / 2 - 60;
    this.texts = Array.from({ length: SLOTS }, (_, i) =>
      this.add.text(startX + i * 60, 260, CHARSET[0]!, style(40, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5),
    );
    this.add.text(GAME_WIDTH / 2, 380, '←→ 칸 이동   ↑↓ 글자   Enter 확정', SMALL_TEXT).setOrigin(0.5);
    this.render();

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.moveCursor(-1));
    kb.on('keydown-RIGHT', () => this.moveCursor(1));
    kb.on('keydown-UP', () => this.cycle(1));
    kb.on('keydown-DOWN', () => this.cycle(-1));
    kb.on('keydown-ENTER', () => this.confirm());
  }

  private moveCursor(delta: number): void {
    if (this.navigating) return;
    this.cursor = (this.cursor + delta + SLOTS) % SLOTS;
    sfx(this, 'menu');
    this.render();
  }

  private cycle(delta: number): void {
    if (this.navigating) return;
    const n = CHARSET.length;
    this.letters[this.cursor] = (this.letters[this.cursor]! + delta + n) % n;
    sfx(this, 'menu');
    this.render();
  }

  private render(): void {
    this.texts.forEach((t, i) => {
      t.setText(CHARSET[this.letters[i]!]!);
      t.setColor(i === this.cursor ? '#ffd166' : '#ffffff');
    });
  }

  private confirm(): void {
    if (this.navigating) return;
    this.navigating = true;
    const initials = sanitizeInitials(this.letters.map((i) => CHARSET[i]!).join(''));
    const entry: HighscoreEntry = {
      initials,
      score: this.args.score,
      member: this.args.member,
      stageReached: this.args.stageReached,
      date: new Date().toISOString().slice(0, 10),
    };
    const { save } = insertScore(loadArcadeSave(), entry);
    persistArcadeSave(save);
    sfx(this, 'menu');
    this.scene.start(SCENE.title);
  }
}
