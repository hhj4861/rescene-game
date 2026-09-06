import Phaser from 'phaser';
import { SCENE, playerTex } from '../core/AssetKeys';
import { playerAnimKey } from '../core/spriteFrames';
import { addPortrait } from '../ui/portrait';
import { RunStore } from '../core/RunStore';
import { setRun } from '../core/runSession';
import { MEMBERS, getMeme, getStageByIndex } from '../data/index';
import { sfx } from '../audio/audioSession';
import { SMALL_TEXT, TITLE_TEXT, UI_TEXT, style } from '../ui/textStyles';
import { GAME_WIDTH } from '../config';
import type { CutsceneData } from './CutsceneScene';

export class CharacterSelectScene extends Phaser.Scene {
  private index = 0;
  private stageIndex = 1;
  private cards: Phaser.GameObjects.Container[] = [];
  private portraits: Phaser.GameObjects.Image[] = [];
  private detail!: Phaser.GameObjects.Text;
  private navigating = false;

  constructor() {
    super(SCENE.select);
  }

  init(data: { stageIndex?: number } | undefined): void {
    this.stageIndex = data?.stageIndex ?? 1;
    this.index = 0;
    this.navigating = false;
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 60, '누구로 무대에 설까?', TITLE_TEXT).setOrigin(0.5);
    const gap = 170;
    const startX = GAME_WIDTH / 2 - gap * 2;
    this.portraits = [];
    this.cards = MEMBERS.map((m, i) => {
      const c = this.add.container(startX + i * gap, 200);
      const face = addPortrait(this, 0, -40, m.id, 0, 2, m.color);   // 선택된 멤버는 render()에서 시그니처 표정
      this.portraits.push(face.portrait);
      c.add(face);
      c.add(this.add.sprite(0, 84, playerTex(m.id)).setScale(2).play(playerAnimKey(m.id, 'idle')));
      c.add(this.add.text(0, 146, m.name, UI_TEXT).setOrigin(0.5));
      c.add(this.add.text(0, 168, m.role, SMALL_TEXT).setOrigin(0.5));
      return c;
    });
    this.detail = this.add.text(GAME_WIDTH / 2, 420, '', style(14, '#c0caf5', { align: 'center' })).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 500, '←→ 선택   Enter 결정   Esc 뒤로', SMALL_TEXT).setOrigin(0.5);
    this.render();

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-ESC', () => this.back());
  }

  private back(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SCENE.title);
  }

  private move(delta: number): void {
    if (this.navigating) return;
    this.index = (this.index + delta + MEMBERS.length) % MEMBERS.length;
    sfx(this, 'menu');
    this.render();
  }

  private render(): void {
    this.cards.forEach((c, i) => c.setScale(i === this.index ? 1.1 : 0.95).setAlpha(i === this.index ? 1 : 0.6));
    this.portraits.forEach((p, i) => p.setFrame(i === this.index ? 1 : 0));
    const m = MEMBERS[this.index]!;
    this.detail.setText([`${m.name} · ${m.hometown} · 공격 ${m.atk} 속도 ${m.spd} 점프 ${m.jump}`, `필살기 "${m.superText}"`]);
  }

  private confirm(): void {
    if (this.navigating) return;
    this.navigating = true;
    sfx(this, 'menu');
    const m = MEMBERS[this.index]!;
    const stage = getStageByIndex(this.stageIndex) ?? getStageByIndex(1)!;
    const store = new RunStore(m.id, (id) => getMeme(id).buff, stage.index);
    setRun(this, store);
    this.scene.start(SCENE.cutscene, {
      lines: stage.intro,
      voice: 'npc',
      next: { start: SCENE.world, data: { stageId: stage.id } },
    } satisfies CutsceneData);
  }
}
