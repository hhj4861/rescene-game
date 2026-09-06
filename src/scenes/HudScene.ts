import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { TEX2, lifeTex } from '../core/ArcadeAssetKeys';
import { loadArcadeSave } from '../core/arcadeSave';
import { getRun } from '../core/runSession';
import { sfx } from '../audio/audioSession';
import { getMeme, getMember } from '../data/index';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Bar } from '../ui/Bar';
import { style } from '../ui/textStyles';
import type { HudBossInfo, HudCheer, HudClear, WorldScene } from './WorldScene';

const MAX_LIFE_ICONS = 5;
const GO_MS = 1500;
const CARD_MS = 1500;
const CHEER_MS = 2500;
const RAINBOW = [0xf7768e, 0xff9e64, 0xe0af68, 0x9ece6a, 0x7dcfff, 0x7aa2f7, 0xbb9af7];
const GAUGE_COLOR = 0xbb9af7;
const CX = GAME_WIDTH / 2;

const pad7 = (n: number): string => String(Math.max(0, Math.min(9_999_999, Math.floor(n)))).padStart(7, '0');
const stroked = (size: number, color: string, extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}) =>
  style(size, color, { stroke: '#000000', strokeThickness: 3, ...extra });

/** 아케이드 HUD: 얼굴·하트·목숨 / 점수·HI / 게이지 / 콤보·GO·보스 이름·카드 자막 / 보스 바. 숫자는 점수뿐. */
export class HudScene extends Phaser.Scene {
  private lives: Phaser.GameObjects.Image[] = [];
  private hearts: Phaser.GameObjects.Image[] = [];
  private score!: Phaser.GameObjects.Text;
  private gauge!: Bar;
  private superMark!: Phaser.GameObjects.Text;
  private combo!: Phaser.GameObjects.Text;
  private go!: Phaser.GameObjects.Sprite;
  private bossName!: Phaser.GameObjects.Text;
  private bossBar!: Bar;
  private cardText!: Phaser.GameObjects.Text;
  private cheerText!: Phaser.GameObjects.Text;
  private clearText!: Phaser.GameObjects.Text;
  private unsubs: (() => void)[] = [];
  private worldListeners: [string, (...args: never[]) => void][] = [];
  private goUntil = 0;
  private cardUntil = 0;
  private cheerUntil = 0;
  private rainbowAt = 0;
  private rainbowIdx = 0;

  constructor() {
    super(SCENE.hud);
  }

  create(): void {
    const run = getRun(this);
    const member = getMember(run.state.member);
    const memberId = member.id;

    // 좌상: 얼굴(머리 3배) + 하트 + 목숨
    this.add.image(14, 12, lifeTex(memberId)).setOrigin(0).setScale(3);
    this.add.text(70, 12, member.name, stroked(13, '#ffffff', { fontStyle: 'bold' }));
    this.hearts = [];
    this.lives = Array.from({ length: MAX_LIFE_ICONS }, (_, i) => this.add.image(70 + i * 20, 52, lifeTex(memberId)).setOrigin(0, 0.5).setScale(1.25));

    // 우상: 점수 + HI
    this.score = this.add.text(GAME_WIDTH - 16, 10, pad7(0), stroked(26, '#ffffff', { fontStyle: 'bold', strokeThickness: 4 })).setOrigin(1, 0);
    const hi = loadArcadeSave().highscores[0]?.score ?? 0;
    this.add.text(GAME_WIDTH - 16, 44, `HI ${pad7(hi)}`, stroked(13, '#ffd166')).setOrigin(1, 0);

    // 하단 중앙: 리센느 게이지
    this.add.text(CX - 106, GAME_HEIGHT - 22, 'S', stroked(13, '#bb9af7', { fontStyle: 'bold' })).setOrigin(1, 0.5);
    this.gauge = new Bar(this, CX - 100, GAME_HEIGHT - 22, 200, 12, '#bb9af7', false);
    this.superMark = this.add.text(CX + 108, GAME_HEIGHT - 22, 'S!', stroked(18, '#ffd166', { fontStyle: 'bold' })).setOrigin(0, 0.5).setVisible(false);

    // 중앙 상단: 보스 이름 · 콤보 · GO · 클리어 · 카드 자막
    this.bossName = this.add.text(CX, 24, '', stroked(16, '#bb9af7', { fontStyle: 'bold' })).setOrigin(0.5).setVisible(false);
    this.combo = this.add.text(CX, 72, '', stroked(30, '#ffd166', { fontStyle: 'bold', strokeThickness: 4 })).setOrigin(0.5).setVisible(false);
    this.go = this.add.sprite(CX, 130, TEX2.go).setScale(3).setVisible(false);
    this.go.play(`${TEX2.go}_anim`);
    this.clearText = this.add.text(CX, 200, '', stroked(34, '#ffffff', { fontStyle: 'bold', strokeThickness: 5, align: 'center' })).setOrigin(0.5).setVisible(false);
    this.cardText = this.add.text(CX, 260, '', stroked(26, '#ffffff', { fontStyle: 'bold', strokeThickness: 5, align: 'center', wordWrap: { width: 700 } })).setOrigin(0.5).setVisible(false);
    this.cheerText = this.add.text(CX, GAME_HEIGHT - 72, '', stroked(14, '#c0caf5')).setOrigin(0.5).setVisible(false);

    // 하단: 보스 체력 바(페이즈 구분선은 hud:boss 에서)
    this.bossBar = new Bar(this, CX - 200, GAME_HEIGHT - 46, 400, 12, '#bb9af7', false);
    this.bossBar.setVisible(false);

    // 조작 힌트는 좌하단(게이지 왼쪽 끝 374px 안쪽에서 끝나야 "S" 라벨과 겹치지 않는다).
    this.add.text(12, GAME_HEIGHT - 8, '←→ 이동 · Space 점프 · ↑↓ 사다리 · A 공격 · S 필살기 · M 음소거', stroked(11, '#a9b1d6')).setOrigin(0, 1);

    this.unsubs = [
      run.bus.on('changed', () => this.refresh()),
      run.bus.on('lifeLost', () => this.refresh()),
      run.bus.on('gaugeFull', () => this.onGaugeFull()),
      run.bus.on('combo', ({ count }) => this.showCombo(count)),
      run.bus.on('card', ({ memeId }) => this.showCard(memeId)),
    ];
    this.listenWorld('hud:go', () => this.showGo());
    this.listenWorld('hud:boss', (info: HudBossInfo) => this.setBoss(info));
    this.listenWorld('hud:cheer', (c: HudCheer) => this.showCheer(c));
    this.listenWorld('hud:clear', (c: HudClear) => this.showClear(c));
    this.listenWorld('hud:reset', () => this.reset());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const u of this.unsubs) u();
      this.unsubs = [];
      const world = this.scene.get(SCENE.world);
      for (const [key, fn] of this.worldListeners) world?.events.off(key, fn);
      this.worldListeners = [];
    });
    this.refresh();
  }

  private listenWorld<T>(key: string, fn: (payload: T) => void): void {
    const world = this.scene.get(SCENE.world);
    if (!world) return;
    world.events.on(key, fn);
    this.worldListeners.push([key, fn as (...args: never[]) => void]);
  }

  // ---------- 표시 ----------

  private refresh(): void {
    const s = getRun(this).state;
    this.lives.forEach((img, i) => img.setVisible(i < s.lives));
    while (this.hearts.length < s.maxHearts) {
      const i = this.hearts.length;
      this.hearts.push(this.add.image(70 + i * 26, 34, TEX2.hudHeartFull).setOrigin(0, 0.5).setScale(2));
    }
    this.hearts.forEach((img, i) => img.setVisible(i < s.maxHearts).setTexture(i < s.hearts ? TEX2.hudHeartFull : TEX2.hudHeartEmpty));
    this.score.setText(pad7(s.score));
    this.gauge.set(s.gauge / 100);
    const full = s.gauge >= 100;
    this.superMark.setVisible(full);
    if (!full) this.gauge.setFillColor(GAUGE_COLOR);
  }

  private onGaugeFull(): void {
    sfx(this, 'gauge');
    this.tweens.add({ targets: this.superMark, scale: 1.6, duration: 120, yoyo: true, repeat: 2 });
  }

  private showCombo(count: number): void {
    if (count <= 0) {
      this.combo.setVisible(false);
      return;
    }
    this.combo.setText(`x${count}`).setVisible(true).setScale(1.5);
    this.tweens.add({ targets: this.combo, scale: 1, duration: 160, ease: 'Back.easeOut' });
  }

  private showGo(): void {
    this.goUntil = this.time.now + GO_MS;
    this.go.setVisible(true).setAlpha(1);
    this.tweens.add({ targets: this.go, alpha: 0.2, duration: 180, yoyo: true, repeat: 4 });
  }

  private setBoss(info: HudBossInfo): void {
    const on = !!info;
    this.bossName.setVisible(on);
    this.bossBar.setVisible(on);
    if (!info) return;
    this.bossName.setText(info.name);
    this.bossBar.setTicks(info.phases.map((p) => p.hpRatio));
    this.bossBar.set(1);
    this.bossBar.setVisible(true);
  }

  private showCheer(c: HudCheer): void {
    this.cheerUntil = this.time.now + CHEER_MS;
    this.cheerText.setText(`${c.name}: “${c.text}”`).setVisible(true);
  }

  private showCard(memeId: string): void {
    const meme = getMeme(memeId);
    this.cardUntil = this.time.now + CARD_MS;
    this.cardText.setText(`“${meme.text}”`).setColor(getMember(meme.member).color).setVisible(true).setScale(0.6);
    this.tweens.add({ targets: this.cardText, scale: 1, duration: 200, ease: 'Back.easeOut' });
  }

  private showClear(c: HudClear): void {
    this.clearText.setText(c.noHit ? 'STAGE CLEAR!\nNO HIT!' : 'STAGE CLEAR!').setVisible(true).setScale(0.5);
    this.tweens.add({ targets: this.clearText, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.setBoss(null);
  }

  /** WorldScene 재시작 때(구간 재도전) 남아 있던 표시를 지운다. */
  private reset(): void {
    this.setBoss(null);
    this.go.setVisible(false);
    this.combo.setVisible(false);
    this.cardText.setVisible(false);
    this.cheerText.setVisible(false);
    this.clearText.setVisible(false);
    this.goUntil = this.cardUntil = this.cheerUntil = 0;
    this.refresh();
  }

  update(): void {
    const now = this.time.now;
    if (this.go.visible && now >= this.goUntil) this.go.setVisible(false);
    if (this.cardText.visible && now >= this.cardUntil) this.cardText.setVisible(false);
    if (this.cheerText.visible && now >= this.cheerUntil) this.cheerText.setVisible(false);

    if (getRun(this).state.gauge >= 100 && now >= this.rainbowAt) {
      this.rainbowAt = now + 80;
      this.rainbowIdx = (this.rainbowIdx + 1) % RAINBOW.length;
      this.gauge.setFillColor(RAINBOW[this.rainbowIdx]!);
    }

    const boss = (this.scene.get(SCENE.world) as WorldScene | null)?.activeBoss() ?? null;
    if (boss && this.bossBar) {
      this.bossBar.set(Math.max(0, boss.hp) / boss.maxHp);
      this.bossName.setText(`${boss.def.name} — ${boss.phaseName()}`);
    }
  }
}
