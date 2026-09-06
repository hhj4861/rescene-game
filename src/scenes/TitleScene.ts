import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { loadArcadeSave, persistArcadeSave } from '../core/arcadeSave';
import { setMuted } from '../systems/highscore';
import { getAudio, sfx } from '../audio/audioSession';
import { ToastQueue } from '../ui/Toast';
import { SMALL_TEXT, TITLE_TEXT, UI_TEXT, style } from '../ui/textStyles';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

const LEGACY_SAVE_PREFIX = 'rescene.save.';
const MENU_ITEMS = ['게임 시작', '스테이지 셀렉트', '리센느 사전'] as const;

export class TitleScene extends Phaser.Scene {
  private selected = 0;
  private rows: Phaser.GameObjects.Text[] = [];
  private muted = false;

  constructor() {
    super(SCENE.title);
  }

  create(): void {
    this.selected = 0;
    const toast = new ToastQueue(this, GAME_WIDTH / 2, GAME_HEIGHT - 108);
    this.clearLegacySaves(toast);

    const save = loadArcadeSave();
    this.muted = save.settings.muted;
    getAudio(this)?.setMuted(this.muted);

    this.add.text(GAME_WIDTH / 2, 90, 'RESCENE STORY', TITLE_TEXT).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 132, '팬메이드 비영리 아케이드', SMALL_TEXT).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 178, 'HIGH SCORE', style(13, '#ffd166', { fontStyle: 'bold' })).setOrigin(0.5);
    const top5 = save.highscores.slice(0, 5);
    if (top5.length === 0) {
      this.add.text(GAME_WIDTH / 2, 200, '아직 기록이 없습니다', SMALL_TEXT).setOrigin(0.5);
    } else {
      top5.forEach((h, i) => {
        this.add
          .text(GAME_WIDTH / 2, 200 + i * 20, `${i + 1}. ${h.initials}  ${String(h.score).padStart(7, '0')}`, SMALL_TEXT)
          .setOrigin(0.5);
      });
    }

    this.rows = MENU_ITEMS.map((label, i) => this.add.text(GAME_WIDTH / 2, 340 + i * 36, label, UI_TEXT).setOrigin(0.5));
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 70, 'PRESS ENTER', style(14, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 42, '↑↓ 선택   Enter 확인   M 음소거', SMALL_TEXT).setOrigin(0.5);
    this.render();

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-M', () => this.toggleMute());
    kb.once('keydown', () => {
      const bus = getAudio(this);
      bus?.unlock();
      bus?.bgm('title');
    });
  }

  private clearLegacySaves(toast: ToastQueue): void {
    const ls = window.localStorage;
    const legacyKeys: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(LEGACY_SAVE_PREFIX)) legacyKeys.push(k);
    }
    if (legacyKeys.length === 0) return;
    legacyKeys.forEach((k) => ls.removeItem(k));
    toast.push(`이전 버전 저장 데이터 ${legacyKeys.length}개를 정리했습니다`, '#ffd166');
  }

  private move(delta: number): void {
    this.selected = (this.selected + delta + MENU_ITEMS.length) % MENU_ITEMS.length;
    sfx(this, 'menu');
    this.render();
  }

  private render(): void {
    this.rows.forEach((r, i) => r.setStyle(i === this.selected ? style(16, '#ffffff', { fontStyle: 'bold' }) : UI_TEXT).setText(`${i === this.selected ? '▶ ' : '   '}${MENU_ITEMS[i]}`));
  }

  private toggleMute(): void {
    this.muted = !this.muted;
    getAudio(this)?.setMuted(this.muted);
    persistArcadeSave(setMuted(loadArcadeSave(), this.muted));
  }

  private confirm(): void {
    sfx(this, 'menu');
    if (this.selected === 0) this.scene.start(SCENE.select);
    else if (this.selected === 1) this.scene.start(SCENE.stageSelect);
    else this.scene.start(SCENE.codex);
  }
}
