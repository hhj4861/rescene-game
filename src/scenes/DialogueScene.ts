import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { getSession } from '../core/session';
import { getDialogue, getMember, speakerName } from '../data/index';
import { DialogueRunner } from '../systems/dialogue';
import { MEMBER_IDS, type MemberId } from '../systems/types';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { style } from '../ui/textStyles';

export interface DialogueData {
  scriptId: string;
  onDone?: (flags: Set<string>) => void;
}

const BOX_H = 150;
const CHARS_PER_TICK = 1;
const TICK_MS = 22;

export class DialogueScene extends Phaser.Scene {
  private args!: DialogueData; // Scene.data(DataManager)와 이름이 겹치지 않게
  private runner!: DialogueRunner;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private choiceIndex = 0;
  private fullText = '';
  private shown = 0;
  private typing: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super(SCENE.dialogue);
  }

  init(data: DialogueData): void {
    this.args = data;
  }

  create(): void {
    const gs = getSession(this).gs;
    this.runner = new DialogueRunner(getDialogue(this.args.scriptId), gs.flags);
    const top = GAME_HEIGHT - BOX_H - 70;
    this.add.rectangle(0, top, GAME_WIDTH, BOX_H, 0x16161e, 0.95).setOrigin(0, 0).setStrokeStyle(2, 0x565f89);
    this.nameText = this.add.text(24, top + 12, '', style(15, '#ffd166', { fontStyle: 'bold' }));
    this.bodyText = this.add.text(24, top + 40, '', style(16, '#ffffff', { wordWrap: { width: GAME_WIDTH - 300 }, lineSpacing: 6 }));
    this.add.text(GAME_WIDTH - 24, top + BOX_H - 18, 'Enter ▶', style(11, '#a9b1d6')).setOrigin(1, 0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', () => this.advance());
    kb.on('keydown-SPACE', () => this.advance());
    kb.on('keydown-UP', () => this.moveChoice(-1));
    kb.on('keydown-DOWN', () => this.moveChoice(1));
    this.showNode();
  }

  private speakerColor(id: string): string {
    return (MEMBER_IDS as string[]).includes(id) ? getMember(id as MemberId).color : id === 'narrator' ? '#a9b1d6' : '#7dcfff';
  }

  private showNode(): void {
    const node = this.runner.current();
    const name = speakerName(node.speaker);
    this.nameText.setText(name).setColor(this.speakerColor(node.speaker));
    this.bodyText.setStyle(node.speaker === 'narrator' ? style(16, '#c0caf5', { fontStyle: 'italic', wordWrap: { width: GAME_WIDTH - 300 }, lineSpacing: 6 }) : style(16, '#ffffff', { wordWrap: { width: GAME_WIDTH - 300 }, lineSpacing: 6 }));
    this.fullText = node.text;
    this.shown = 0;
    this.bodyText.setText('');
    this.clearChoices();
    this.typing?.remove();
    this.typing = this.time.addEvent({
      delay: TICK_MS, loop: true,
      callback: () => {
        this.shown = Math.min(this.fullText.length, this.shown + CHARS_PER_TICK);
        this.bodyText.setText(this.fullText.slice(0, this.shown));
        if (this.shown >= this.fullText.length) this.finishTyping();
      },
    });
  }

  private finishTyping(): void {
    this.typing?.remove();
    this.typing = null;
    this.shown = this.fullText.length;
    this.bodyText.setText(this.fullText);
    if (this.runner.awaitingChoice()) this.renderChoices();
  }

  private renderChoices(): void {
    this.clearChoices();
    this.choiceIndex = 0;
    const top = GAME_HEIGHT - BOX_H - 70;
    this.choiceTexts = this.runner.choices().map((c, i) =>
      this.add.text(GAME_WIDTH - 260, top + 40 + i * 26, c.text, style(14, '#ffffff')).setInteractive(),
    );
    this.highlightChoice();
  }

  private highlightChoice(): void {
    this.choiceTexts.forEach((t, i) => t.setText(`${i === this.choiceIndex ? '▶ ' : '   '}${this.runner.choices()[i]!.text}`).setColor(i === this.choiceIndex ? '#ffd166' : '#ffffff'));
  }

  private clearChoices(): void {
    this.choiceTexts.forEach((t) => t.destroy());
    this.choiceTexts = [];
  }

  private moveChoice(delta: number): void {
    if (!this.choiceTexts.length) return;
    this.choiceIndex = (this.choiceIndex + delta + this.choiceTexts.length) % this.choiceTexts.length;
    this.highlightChoice();
  }

  private advance(): void {
    if (this.typing) { this.finishTyping(); return; }
    if (this.runner.awaitingChoice()) {
      this.runner.choose(this.choiceIndex);
      this.showNode();
      return;
    }
    if (this.runner.next()) this.showNode();
    else this.close();
  }

  private close(): void {
    const gs = getSession(this).gs;
    this.args.onDone?.(gs.flags);
    this.scene.stop();
    this.scene.resume(SCENE.world);
  }
}
