import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { GameState } from '../core/GameState';
import { setSession } from '../core/session';
import { QUESTS, getMember } from '../data/index';
import { SLOT_COUNT, createLocalStorageStore, listSlots, loadGame, type SlotSummary } from '../systems/save';
import { SMALL_TEXT, TITLE_TEXT, UI_TEXT, style } from '../ui/textStyles';
import { GAME_WIDTH } from '../config';

export class TitleScene extends Phaser.Scene {
  private selected = 0;
  private rows: Phaser.GameObjects.Text[] = [];
  private summaries: (SlotSummary | null)[] = [];
  private readonly store = createLocalStorageStore(window.localStorage);

  constructor() {
    super(SCENE.title);
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 90, '리센느스토리', TITLE_TEXT).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 135, 'RESCENE STORY — 팬메이드 비영리', SMALL_TEXT).setOrigin(0.5);
    this.summaries = listSlots(this.store);
    this.rows = this.summaries.map((s, i) => this.add.text(GAME_WIDTH / 2, 230 + i * 44, this.label(i, s), UI_TEXT).setOrigin(0.5));
    this.add.text(GAME_WIDTH / 2, 420, '↑↓ 슬롯 선택   Enter 시작/이어하기   N 새로 시작(덮어쓰기)', SMALL_TEXT).setOrigin(0.5);
    this.render();

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm(false));
    kb.on('keydown-N', () => this.confirm(true));
  }

  private label(i: number, s: SlotSummary | null): string {
    if (!s) return `슬롯 ${i + 1}  —  비어 있음`;
    const minutes = Math.floor(s.playTimeMs / 60000);
    return `슬롯 ${i + 1}  —  ${getMember(s.member).name} Lv.${s.level} · 장면 ${s.chapter} · ${minutes}분`;
  }

  private move(delta: number): void {
    this.selected = (this.selected + delta + SLOT_COUNT) % SLOT_COUNT;
    this.render();
  }

  private render(): void {
    this.rows.forEach((r, i) => r.setStyle(i === this.selected ? style(16, '#ffffff', { fontStyle: 'bold' }) : UI_TEXT).setText(`${i === this.selected ? '▶ ' : '   '}${this.label(i, this.summaries[i] ?? null)}`));
  }

  private confirm(forceNew: boolean): void {
    const slot = this.selected;
    let snap: ReturnType<typeof loadGame> = null;
    if (!forceNew) {
      try {
        snap = loadGame(this.store, slot);
      } catch (err) {
        console.warn('save slot unreadable', err);
        this.store.clear(slot);
        snap = null;
      }
    }
    if (!snap) {
      this.scene.start(SCENE.select, { slot });
      return;
    }
    const gs = GameState.fromSnapshot(snap, QUESTS);
    setSession(this, { gs, slot, store: this.store });
    this.scene.start(SCENE.world, { mapId: gs.location.mapId, spawnId: gs.location.spawnId });
  }
}
