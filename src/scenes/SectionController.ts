import type Phaser from 'phaser';
import type { SectionDef, StageDef } from '../data/schema';
import { dueSpawns, enemyDied, openSection, startSection, type SectionPhase, type SectionState } from '../systems/waves';
import { GAME_WIDTH } from '../config';
import { findSpawn, findSpawnOrNull, lockX } from './worldObjects';

/** 씬(WorldScene)이 구현하는 접착 훅. 순수 상태 머신은 systems/waves.ts 가 담당한다. */
export interface SectionHooks {
  spawnEnemy(enemyId: string, x: number, y: number, elite: boolean): void;
  spawnBoss(enemyId: string, x: number, y: number): void;
  /** HUD: 응원 NPC·보스 이름. 구간이 잠기는 순간 1회. */
  onSectionStart(index: number, def: SectionDef | 'boss'): void;
  /** GO 화살표·상자 드랍. 웨이브가 전멸한 순간 1회. */
  onSectionCleared(index: number, chest: boolean): void;
  /** 카메라·물리 월드 바운드를 [minX, maxX] 로 맞춘다. locked 면 maxX 가 잠금선(막대 표시). */
  setCameraBounds(minX: number, maxX: number, locked: boolean): void;
}

/** 보스 구간의 플레이어 재시작 스폰 이름(맵 관례). 없으면 boss.spawn 에서 왼쪽으로 물러난 자리. */
const BOSS_ENTRY_SPAWN = 're_boss';
const BOSS_ENTRY_FALLBACK_DX = -300;

/**
 * 구간 k 는 이전 잠금선을 넘는 순간 시작한다(k=0 은 시작 즉시, 재시작 스폰은 이미 잠금선 뒤라 즉시).
 * 잠기면 바운드가 [lockX-960, lockX](맵 안으로 클램프), 전멸하면 다음 잠금선까지 열린다.
 * 마지막 인덱스(sections.length)는 보스 구간이며 보스 사망은 씬이 처리한다.
 */
export class SectionController {
  private readonly locks: number[];      // sections 순서대로 잠금선 x, 마지막은 보스 잠금선
  private readonly mapWidth: number;
  private readonly mapHeight: number;
  private current: number;
  private state: SectionState | null = null;
  private bossStarted = false;
  private minX = 0;

  constructor(
    private readonly stage: StageDef,
    private readonly map: Phaser.Tilemaps.Tilemap,
    private readonly hooks: SectionHooks,
    startIndex: number,
  ) {
    this.locks = [...stage.sections.map((s) => lockX(map, s.lock)), lockX(map, stage.boss.lock)];
    this.mapWidth = map.widthInPixels;
    this.mapHeight = map.heightInPixels;
    this.current = Math.max(0, Math.min(stage.sections.length, startIndex));
  }

  /** 재시작 위치: sections[i].spawn 또는 보스 구간 입구. */
  entrySpawn(index: number): { x: number; y: number } {
    const sec = this.stage.sections[index];
    if (sec) return findSpawn(this.map, sec.spawn);
    const named = findSpawnOrNull(this.map, BOSS_ENTRY_SPAWN);
    if (named) return named;
    const boss = findSpawn(this.map, this.stage.boss.spawn);
    return { x: Math.max(this.prevLockX(this.stage.sections.length) + 48, boss.x + BOSS_ENTRY_FALLBACK_DX), y: boss.y };
  }

  /** 0..sections.length (== sections.length 면 보스). */
  get index(): number {
    return this.current;
  }

  get phase(): SectionPhase | 'boss' {
    if (this.isBossSection()) return 'boss';
    return this.state?.phase ?? 'open';
  }

  get mapSize(): { width: number; height: number } {
    return { width: this.mapWidth, height: this.mapHeight };
  }

  isBossSection(): boolean {
    return this.current >= this.stage.sections.length;
  }

  /** 잠금선 통과 감지 → startSection → dueSpawns → spawnEnemy. 열린 상태면 다음 잠금선을 감시한다. */
  update(now: number, playerX: number): void {
    if (this.isBossSection()) {
      if (!this.bossStarted && playerX > this.prevLockX(this.current)) this.beginBoss();
      return;
    }
    if (!this.state) {
      if (playerX > this.prevLockX(this.current)) this.begin(now);
      return;
    }
    if (this.state.phase === 'locked') {
      const r = dueSpawns(this.state, now);
      this.state = r.state;
      for (const o of r.spawns) {
        const at = findSpawn(this.map, o.spawn);
        this.hooks.spawnEnemy(o.enemy, at.x, at.y, o.elite);
      }
      return;
    }
    if (this.state.phase === 'open' && playerX > this.lockOf(this.current)) {
      this.current += 1;
      this.state = null;
      if (this.isBossSection()) this.beginBoss();
      else this.begin(now);
    }
  }

  enemyDied(now: number): void {
    if (!this.state || this.state.phase !== 'locked') return;
    this.state = enemyDied(this.state, now);
    if (this.state.phase !== 'cleared') return;
    const def = this.stage.sections[this.current]!;
    this.state = openSection(this.state);
    this.hooks.onSectionCleared(this.current, !!def.chest);
    this.hooks.setCameraBounds(this.minX, Math.min(this.mapWidth, this.lockOf(this.current + 1)), false);
  }

  private begin(now: number): void {
    const def = this.stage.sections[this.current]!;
    this.state = startSection(def, this.current, now);
    this.lock(this.lockOf(this.current));
    this.hooks.onSectionStart(this.current, def);
  }

  private beginBoss(): void {
    this.bossStarted = true;
    this.lock(this.lockOf(this.current));
    this.hooks.onSectionStart(this.current, 'boss');
    const at = findSpawn(this.map, this.stage.boss.spawn);
    this.hooks.spawnBoss(this.stage.boss.id, at.x, at.y);
  }

  private lock(lockLine: number): void {
    const maxX = Math.min(this.mapWidth, lockLine);
    this.minX = Math.max(0, maxX - GAME_WIDTH);
    this.hooks.setCameraBounds(this.minX, maxX, true);
  }

  /** 구간 index 의 잠금선 x. 범위 밖(보스 다음)은 맵 끝. */
  private lockOf(index: number): number {
    return this.locks[index] ?? this.mapWidth;
  }

  private prevLockX(index: number): number {
    return index <= 0 ? -Infinity : this.lockOf(index - 1);
  }
}
