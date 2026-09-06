import Phaser from 'phaser';
import { SCENE, mapKey } from '../core/AssetKeys';
import { tilesetTex } from '../core/ArcadeAssetKeys';
import type { RunStore } from '../core/RunStore';
import { getRun } from '../core/runSession';
import { loadArcadeSave, persistArcadeSave } from '../core/arcadeSave';
import { getAudio, sayMeme, sfx, speakAs } from '../audio/audioSession';
import { getMember, getMeme, getNpc, getStage } from '../data/index';
import type { NpcDef, SectionDef, StageDef } from '../data/schema';
import { NPC_VOICE } from '../data/voice';
import { setMuted } from '../systems/highscore';
import type { MoveConfig } from '../systems/movement';
import { clearBonus } from '../systems/score';
import type { Boss, BossPhase } from '../entities/Boss';
import { CheerNpc } from '../entities/CheerNpc';
import { Chest } from '../entities/Chest';
import type { Enemy } from '../entities/Enemy';
import { JumpPad } from '../entities/JumpPad';
import { Player } from '../entities/Player';
import { floatText } from '../ui/FloatText';
import { CombatController, type BossKind, type CombatHooks } from './CombatController';
import { SectionController, type SectionHooks } from './SectionController';
import { findSpawn, jumpPadSpots } from './worldObjects';

// ---- 씬 데이터 계약(플랜 상단). T6 메뉴 씬과는 SCENE 키와 이 형태로만 통신한다. ----
/** elapsedMs: 구간 재시작 때 스테이지 타이머를 이어 가기 위한 누적 시간. 컨티뉴·새 스테이지는 생략(0). */
export interface WorldData { stageId: string; sectionIndex?: number; elapsedMs?: number }
export interface ResultData { stageId: string; kills: number; maxCombo: number; noHitBoss: boolean; remainingSec: number }
export interface ContinueData { stageId: string }

// ---- HudScene 이 듣는 이벤트 페이로드(this.events.emit('hud:*')). ----
/** mid: 중간보스(웨이브 안의 ai:'boss' 적). HUD 가 라벨을 달리 한다. */
export type HudBossInfo = { name: string; phases: BossPhase[]; mid: boolean } | null;
export interface HudCheer { name: string; text: string }
export interface HudClear { noHit: boolean }

const FALLBACK_PALETTE = 'stage1';         // 팔레트 텍스처가 아직 없으면(P2 머지 전) 스테이지 1 타일로
const DEATH_FADE_MS = 900;
const STAGE_CLEAR_HOLD_MS = 1800;
const CHEST_CARD_CHANCE = 0.3;
const CHEST_OPEN_DELAY_MS = 350;
const WORLD_BG = '#1f2335';
/** 트로피 수호자 페이즈별 무대 배경색(더쇼 → 음악중심 → 인기가요). */
const TROPHY_STAGE_BG = ['#1a1b26', '#241a2e', '#2a1a1a'] as const;

export class WorldScene extends Phaser.Scene {
  private stageId!: string;
  private sectionIndex: number | undefined;
  private elapsedMs = 0;
  private stage!: StageDef;
  private run!: RunStore;
  private map!: Phaser.Tilemaps.Tilemap;
  private ladders!: Phaser.Tilemaps.TilemapLayer;
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyM!: Phaser.Input.Keyboard.Key;
  private combat!: CombatController;
  private section!: SectionController;
  private chests!: Phaser.Physics.Arcade.Group;
  private jumpPads!: Phaser.GameObjects.Group;
  private cheerNpcs = new Map<number, CheerNpc>();
  private lockBar!: Phaser.GameObjects.Rectangle;
  private transitioning = false;
  private superPlaying = false;
  private startedAt = 0;
  private unsubs: (() => void)[] = [];

  constructor() {
    super(SCENE.world);
  }

  init(data: WorldData): void {
    this.stageId = data.stageId;
    this.sectionIndex = data.sectionIndex;
    this.elapsedMs = Math.max(0, data.elapsedMs ?? 0);
  }

  create(): void {
    // scene.restart() 는 같은 인스턴스를 재사용하므로 플래그를 여기서 리셋한다.
    this.transitioning = false;
    this.superPlaying = false;
    this.cheerNpcs.clear();
    this.run = getRun(this);
    this.run.restartSection();
    this.stage = getStage(this.stageId);
    this.startedAt = this.time.now - this.elapsedMs;

    this.map = this.make.tilemap({ key: mapKey(this.stage.map) });
    const tiles = this.map.addTilesetImage('tiles', this.tilesetKey())!;
    const ground = this.map.createLayer('ground', tiles, 0, 0)!;
    ground.setCollisionByExclusion([-1, 0]);
    const platforms = this.map.createLayer('platforms', tiles, 0, 0)!;
    platforms.setCollisionByExclusion([-1, 0]);
    platforms.forEachTile((t) => { if (t.index > 0) t.setCollision(false, false, true, false); });
    this.ladders = this.map.createLayer('ladders', tiles, 0, 0)!;

    this.section = new SectionController(this.stage, this.map, this.sectionHooks(), this.sectionIndex ?? 0);
    const spawn = this.sectionIndex === undefined ? findSpawn(this.map, 'start') : this.section.entrySpawn(this.sectionIndex);
    this.player = new Player(this, spawn.x, spawn.y, this.run.state.member);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, platforms, undefined, () =>
      this.time.now > this.player.dropThroughUntil && this.player.body.velocity.y >= 0 && !this.player.moveState.climbing);

    this.lockBar = this.add.rectangle(0, 0, 6, this.map.heightInPixels, 0xf7768e, 0.35).setOrigin(1, 0).setDepth(5).setVisible(false);
    this.applyBounds(0, this.map.widthInPixels, false);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBackgroundColor(WORLD_BG);

    const member = this.run.state.member;
    this.stage.sections.forEach((sec, i) => {
      if (!sec.cheer) return;
      const def = getNpc(sec.cheer.npc);
      if (def.member === member) return; // 내가 고른 멤버는 배경에 서 있지 않는다
      const at = findSpawn(this.map, sec.cheer.spawn);
      this.cheerNpcs.set(i, new CheerNpc(this, at.x, at.y, def));
    });

    this.chests = this.physics.add.group();
    this.chests.defaults = {} as Phaser.Types.Physics.Arcade.PhysicsGroupDefaults;
    this.physics.add.collider(this.chests, ground);
    this.physics.add.collider(this.chests, platforms);
    this.physics.add.overlap(this.player, this.chests, (_p, c) => this.openChest(c as Chest));

    // 점프대(밈의 파도). 정적 바디라 물리 그룹이 아니어도 overlap 이 돈다.
    this.jumpPads = this.add.group();
    for (const at of jumpPadSpots(this.map)) this.jumpPads.add(new JumpPad(this, at.x, at.y));
    this.physics.add.overlap(this.player, this.jumpPads, (_p, pad) => this.bounce(pad as JumpPad));

    this.combat = new CombatController(this, this.player, this.run, [ground, platforms], this.combatHooks());

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyM = kb.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    kb.once('keydown', () => getAudio(this)?.unlock());

    this.unsubs = [this.run.bus.on('died', () => this.onPlayerDied())];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const u of this.unsubs) u();
      this.unsubs = [];
      getAudio(this)?.bgm(null);
    });

    if (this.scene.isActive(SCENE.hud)) this.events.emit('hud:reset');
    else this.scene.launch(SCENE.hud);
    const audio = getAudio(this);
    audio?.setMuted(loadArcadeSave().settings.muted);
    audio?.bgm(this.stage.bgm);
    this.cameras.main.fadeIn(200, 0, 0, 0);
    this.installDevHooks();
  }

  // ---------- 런 ----------

  /** 스테이지 팔레트 타일셋. 텍스처가 아직 없으면 스테이지 1 팔레트로 그린다(크래시 대신 폴백). */
  private tilesetKey(): string {
    const key = tilesetTex(this.stage.palette);
    return this.textures.exists(key) ? key : tilesetTex(FALLBACK_PALETTE);
  }

  private moveConfig(): MoveConfig {
    const m = getMember(this.run.state.member);
    const b = this.run.buffs;
    return {
      speed: 160 + 20 * (m.spd + b.spd),
      jumpVelocity: -(380 + 20 * (m.jump + b.jump)),
      climbSpeed: 140,
      maxJumps: 2,
    };
  }

  private remainingSec(): number {
    return Math.max(0, Math.round(this.stage.timerSec - (this.time.now - this.startedAt) / 1000));
  }

  /** HUD 가 보스 바를 그릴 때 읽는다. */
  activeBoss(): Boss | null {
    return this.combat?.boss ?? null;
  }

  // ---------- 구간 ----------

  private sectionHooks(): SectionHooks {
    return {
      spawnEnemy: (id, x, y, elite) => { this.combat.spawnEnemy(id, x, y, elite); },
      spawnBoss: (id, x, y) => { this.combat.spawnBoss(id, x, y); },
      onSectionStart: (index, def) => this.onSectionStart(index, def),
      onSectionCleared: (index, chest) => this.onSectionCleared(index, chest),
      setCameraBounds: (minX, maxX, locked) => this.applyBounds(minX, maxX, locked),
    };
  }

  /** 카메라·물리 월드 바운드를 함께 맞춘다. 플레이어는 collideWorldBounds 라 잠금선을 넘지 못한다. */
  private applyBounds(minX: number, maxX: number, locked: boolean): void {
    const h = this.map.heightInPixels;
    this.cameras.main.setBounds(minX, 0, maxX - minX, h);
    this.physics.world.setBounds(minX, 0, maxX - minX, h);
    this.lockBar.setPosition(maxX, 0).setVisible(locked && maxX < this.map.widthInPixels);
  }

  private onSectionStart(index: number, def: SectionDef | 'boss'): void {
    if (def === 'boss') {
      getAudio(this)?.bgm('boss');
      return;
    }
    if (!def.cheer) return;
    const npc = this.cheerNpcs.get(index);
    if (!npc) return;
    npc.cheer(def.cheer.text);
    speakAs(this, def.cheer.text, this.voiceOf(npc.def));
    this.events.emit('hud:cheer', { name: npc.def.name, text: def.cheer.text } satisfies HudCheer);
  }

  private voiceOf(def: NpcDef) {
    return def.member ? getMember(def.member).voice : NPC_VOICE;
  }

  private onSectionCleared(_index: number, chest: boolean): void {
    sfx(this, 'go');
    this.events.emit('hud:go');
    if (!chest) return;
    const b = this.physics.world.bounds;
    const x = Phaser.Math.Clamp(this.player.x + this.player.facing * 110, b.left + 24, b.right - 24);
    this.chests.add(new Chest(this, x, this.player.y - 40));
  }

  private bounce(pad: JumpPad): void {
    if (pad.launch(this.player, this.time.now)) sfx(this, 'jump');
  }

  private openChest(chest: Chest): void {
    if (!chest.open()) return;
    sfx(this, 'menu');
    const x = chest.x;
    const y = chest.y - 24;
    this.time.delayedCall(CHEST_OPEN_DELAY_MS, () => {
      if (!this.scene.isActive()) return;
      const card = Math.random() < CHEST_CARD_CHANCE ? this.nextCardId() : null;
      if (card) this.combat.dropAt(x, y, { kind: 'card', memeId: card });
      else this.combat.dropAt(x, y, { kind: 'heart', member: this.run.state.member });
    });
  }

  /** cardPool 에서 아직 안 가진 카드 우선, 다 가졌으면 아무거나. */
  private nextCardId(): string | null {
    const owned = new Set(this.run.state.cards);
    const fresh = this.stage.cardPool.filter((id) => !owned.has(id));
    const pool = fresh.length > 0 ? fresh : this.stage.cardPool;
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  // ---------- 전투 훅 ----------

  private combatHooks(): CombatHooks {
    return {
      onEnemyDied: (now) => this.section.enemyDied(now),
      onBossKilled: () => this.onBossKilled(),
      onBossSpawned: (boss, kind) => this.onBossSpawned(boss, kind),
      onMidBossKilled: () => { this.events.emit('hud:boss', null satisfies HudBossInfo); },
      isBossSection: () => this.section.isBossSection(),
      nextCardId: () => this.nextCardId(),
      onHeartPicked: () => {
        sfx(this, 'heart');
        floatText(this, this.player.x, this.player.y - 60, '♥', '#f7768e', 18);
      },
      onCardPicked: (memeId) => {
        const meme = getMeme(memeId);
        sfx(this, 'card');
        sayMeme(this, memeId, meme.text, getMember(meme.member).voice);
      },
    };
  }

  /** 스테이지 보스·중간보스 공통: 페이즈 연출과 HUD 보스 바. */
  private onBossSpawned(boss: Boss, kind: BossKind): void {
    const trophy = boss.def.gimmick === 'trophy';
    boss.onPhaseChange = (phase, name) => {
      sfx(this, 'boss_phase');
      floatText(this, boss.x, boss.y - boss.displayHeight - 20, name, '#bb9af7', 18);
      if (trophy) this.setStageBg(phase);
    };
    if (trophy) this.setStageBg(0);
    this.events.emit('hud:boss', { name: boss.def.name, phases: boss.phases, mid: kind === 'mid' } satisfies HudBossInfo);
  }

  /** 트로피 수호자: 페이즈마다 무대 배경색을 바꾼다(타일셋 교체가 아니라 카메라 배경, 결정 D3). */
  private setStageBg(phase: number): void {
    this.cameras.main.setBackgroundColor(TROPHY_STAGE_BG[Math.min(phase, TROPHY_STAGE_BG.length - 1)] ?? WORLD_BG);
  }

  private onBossKilled(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    const s = this.run.state;
    const result: ResultData = {
      stageId: this.stageId,
      kills: s.stageKills,
      maxCombo: s.maxCombo,
      noHitBoss: !s.bossHit,
      remainingSec: this.remainingSec(),
    };
    const bonus = clearBonus(s.lives, result.remainingSec, result.noHitBoss);
    this.run.stageClear(bonus.total);
    getAudio(this)?.bgm(null);
    sfx(this, 'clear');
    this.player.setVelocity(0, 0);
    this.events.emit('hud:clear', { noHit: result.noHitBoss } satisfies HudClear);
    this.time.delayedCall(STAGE_CLEAR_HOLD_MS, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.stop(SCENE.hud);
        this.scene.start(SCENE.result, result);
      });
    });
  }

  private onPlayerDied(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.physics.pause();
    this.player.setVelocity(0, 0).setTint(0x565f89);
    floatText(this, this.player.x, this.player.y - 60, '무대 실수...', '#f7768e', 18);
    getAudio(this)?.bgm(null);
    this.cameras.main.fadeOut(DEATH_FADE_MS, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const lives = this.run.loseLife();
      if (lives > 0) {
        // 같은 구간에서 다시: 스테이지 타이머는 이어 간다(컨티뉴는 ContinueScene 이 0 부터).
        this.scene.restart({ stageId: this.stageId, sectionIndex: this.section.index, elapsedMs: this.time.now - this.startedAt } satisfies WorldData);
      } else {
        this.scene.stop(SCENE.hud);
        this.scene.start(SCENE.continue, { stageId: this.stageId } satisfies ContinueData);
      }
    });
  }

  private toggleMute(): void {
    const audio = getAudio(this);
    if (!audio) return;
    const muted = !audio.muted;
    audio.setMuted(muted);
    persistArcadeSave(setMuted(loadArcadeSave(), muted));
    floatText(this, this.player.x, this.player.y - 70, muted ? '음소거' : '소리 켜짐', '#a9b1d6', 12);
  }

  // ---------- 프레임 ----------

  update(): void {
    if (this.transitioning) return;
    const now = this.time.now;
    this.run.tick(now);
    if (this.superPlaying) return; // 필살기 연출: 물리 정지·입력 무시
    this.section.update(now, this.player.x);

    if (Phaser.Input.Keyboard.JustDown(this.keyM)) this.toggleMute();
    if (Phaser.Input.Keyboard.JustDown(this.keyA)) this.combat.attack(now);
    if (Phaser.Input.Keyboard.JustDown(this.keyS) && this.combat.castSuper(now, () => { this.superPlaying = false; })) {
      this.superPlaying = true;
      return;
    }

    this.combat.update(now);
    const probe = this.ladders.getTileAtWorldXY(this.player.x, this.player.y - 20);
    const onLadder = !!probe && probe.index > 0;
    this.player.applyMovement(
      {
        left: this.cursors.left.isDown,
        right: this.cursors.right.isDown,
        up: this.cursors.up.isDown,
        down: this.cursors.down.isDown,
        jumpPressed: Phaser.Input.Keyboard.JustDown(this.cursors.space),
      },
      onLadder,
      onLadder ? probe!.getCenterX() : null,
      this.moveConfig(),
    );
  }

  // ---------- 개발용 훅 (e2e) ----------

  private installDevHooks(): void {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __rescene?: unknown }).__rescene = {
      killAllEnemies: () => { for (const e of [...this.combat.enemies.getChildren()]) this.combat.slay(e as Enemy); },
      fillGauge: () => { let guard = 0; while (this.run.state.gauge < 100 && guard++ < 100) this.run.hit(); },
      enemyCount: () => this.combat.enemies.countActive(true),
      sectionIndex: () => this.section.index,
      sectionPhase: () => this.section.phase,
      gauge: () => this.run.state.gauge,
      /** 플레이어를 x 로 옮긴다(바운드 안이어야 한다). */
      warp: (x: number) => { this.player.setPosition(x, this.player.y); },
      /** 하트 n 칸 피해(사망 흐름 검증용). */
      hurt: (n: number) => { this.run.takeHit(n); },
      openChests: () => { for (const c of [...this.chests.getChildren()]) this.openChest(c as Chest); },
      pickupAll: () => this.combat.pickupAll(),
      dropCount: () => this.combat.drops.countActive(true),
      lockLines: () => this.section.lockLines(),
      bossHp: () => this.combat.boss?.hp ?? null,
    };
  }
}
