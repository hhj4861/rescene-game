import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { loadArcadeSave } from '../core/arcadeSave';
import { MEMES, getMember } from '../data/index';
import { sayMeme, sfx } from '../audio/audioSession';
import { SMALL_TEXT, TITLE_TEXT, style } from '../ui/textStyles';
import { GAME_WIDTH } from '../config';

export class CodexScene extends Phaser.Scene {
  private index = 0;
  private codex: string[] = [];
  private ownerText!: Phaser.GameObjects.Text;
  private frontText!: Phaser.GameObjects.Text;
  private backText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE.codex);
  }

  create(): void {
    this.index = 0;
    this.codex = loadArcadeSave().codex;

    this.add.text(GAME_WIDTH / 2, 60, '리센느 사전', TITLE_TEXT).setOrigin(0.5);
    this.ownerText = this.add.text(GAME_WIDTH / 2, 130, '', style(15, '#7dcfff', { fontStyle: 'bold' })).setOrigin(0.5);
    this.frontText = this.add
      .text(GAME_WIDTH / 2, 220, '', style(28, '#ffd166', { fontStyle: 'bold', align: 'center', wordWrap: { width: GAME_WIDTH - 160 } }))
      .setOrigin(0.5);
    this.backText = this.add
      .text(GAME_WIDTH / 2, 320, '', style(14, '#c0caf5', { align: 'center', wordWrap: { width: GAME_WIDTH - 200 }, lineSpacing: 6 }))
      .setOrigin(0.5);
    this.progressText = this.add.text(GAME_WIDTH / 2, 470, '', SMALL_TEXT).setOrigin(0.5);
    this.render();

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-ENTER', () => this.speak());
    kb.on('keydown-ESC', () => this.scene.start(SCENE.title));
  }

  private move(delta: number): void {
    this.index = (this.index + delta + MEMES.length) % MEMES.length;
    sfx(this, 'menu');
    this.render();
  }

  private render(): void {
    const meme = MEMES[this.index]!;
    const owned = this.codex.includes(meme.id);
    this.ownerText.setText(owned ? getMember(meme.member).name : '???');
    this.frontText.setText(owned ? meme.text : '???');
    this.backText.setText(owned ? `${meme.origin}\n${meme.note}` : '아직 획득하지 못한 유행어입니다.');
    this.progressText.setText(`←→ 카드 넘기기   Enter 음성 듣기   Esc 뒤로   (${this.codex.length}/${MEMES.length})`);
  }

  private speak(): void {
    const meme = MEMES[this.index]!;
    if (!this.codex.includes(meme.id)) return;
    sayMeme(this, meme.id, meme.text, getMember(meme.member).voice);
  }
}
