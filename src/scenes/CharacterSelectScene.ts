import Phaser from 'phaser';
import { SCENE, playerTex } from '../core/AssetKeys';
import { GameState } from '../core/GameState';
import { setSession } from '../core/session';
import { MEMBERS, QUESTS, getSkill } from '../data/index';
import { createLocalStorageStore } from '../systems/save';
import { SMALL_TEXT, TITLE_TEXT, UI_TEXT, style } from '../ui/textStyles';
import { GAME_WIDTH } from '../config';
import type { CutsceneData } from './CutsceneScene';

export class CharacterSelectScene extends Phaser.Scene {
  private index = 0;
  private slot = 0;
  private cards: Phaser.GameObjects.Container[] = [];
  private detail!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE.select);
  }

  init(data: { slot: number }): void {
    this.slot = data.slot ?? 0;
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 60, '누구로 걸을까?', TITLE_TEXT).setOrigin(0.5);
    const gap = 170;
    const startX = GAME_WIDTH / 2 - gap * 2;
    this.cards = MEMBERS.map((m, i) => {
      const c = this.add.container(startX + i * gap, 230);
      c.add(this.add.image(0, 0, playerTex(m.id)).setScale(2));
      c.add(this.add.text(0, 70, m.name, UI_TEXT).setOrigin(0.5));
      c.add(this.add.text(0, 92, m.role, SMALL_TEXT).setOrigin(0.5));
      return c;
    });
    this.detail = this.add.text(GAME_WIDTH / 2, 380, '', style(14, '#c0caf5', { align: 'center' })).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 470, '←→ 선택   Enter 결정   Esc 뒤로', SMALL_TEXT).setOrigin(0.5);
    this.render();

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-ESC', () => this.scene.start(SCENE.title));
  }

  private move(delta: number): void {
    this.index = (this.index + delta + MEMBERS.length) % MEMBERS.length;
    this.render();
  }

  private render(): void {
    this.cards.forEach((c, i) => c.setScale(i === this.index ? 1.15 : 1).setAlpha(i === this.index ? 1 : 0.6));
    const m = MEMBERS[this.index]!;
    const sig = getSkill(m.skills[1]!);
    this.detail.setText([`${m.name} · ${m.hometown} · 무기: ${m.weapon}`, `시그니처 스킬 "${sig.name}" — ${sig.origin}`, `체력 ${m.baseStats.hp} 기력 ${m.baseStats.mp} 끼 ${m.baseStats.atk} 멘탈 ${m.baseStats.def} 스피드 ${m.baseStats.spd} 기회 ${m.baseStats.luk}`]);
  }

  private confirm(): void {
    const m = MEMBERS[this.index]!;
    const gs = GameState.newGame(m.id, QUESTS);
    setSession(this, { gs, slot: this.slot, store: createLocalStorageStore(window.localStorage) });
    this.scene.start(SCENE.cutscene, {
      cutsceneId: `ch0_intro_${m.id}`,
      next: { start: SCENE.world, data: { mapId: gs.location.mapId, spawnId: gs.location.spawnId } },
    } satisfies CutsceneData);
  }
}
