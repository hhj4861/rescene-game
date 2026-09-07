import type Phaser from 'phaser';
import type { EnemyDef } from '../../data/schema';
import { Boss } from '../Boss';
import type { Player } from '../Player';

/** 공유 데이터 표 1 의 id. 데이터가 없으면 CombatController.spawnMinion 이 경고만 남긴다. */
const DRONE_ID = 'enemy_spotlight_drone';
const TRAP_ID = 'enemy_stage_trap';
const DRONE_INTERVAL_MS = 8000;
const DRONE_DX = 140;
const TRAP_INTERVAL_MS = 6000;
const MAX_MINIONS = 4;
const DASH_INTERVAL_MS = 2500;
const WAVE_INTERVAL_MS = 1800;
const FIRST_SUMMON_MS = 2000;

/**
 * 트로피 수호자(`trophy`): 페이즈 1 — 8초마다 스포트라이트 드론 2마리 + 느린 추적, 페이즈 2 — 2.5초마다
 * 대시, 페이즈 3 — 1.8초마다 양방향 탄 + 6초마다 무대 트랩 1개(플레이어 근처). 페이즈 전환의 무대
 * 배경색 변화는 WorldScene 이 onPhaseChange 에서 처리한다.
 */
export class TrophyBoss extends Boss {
  private nextSummonAt: number;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef) {
    super(scene, x, y, def);
    this.nextSummonAt = scene.time.now + FIRST_SUMMON_MS;
  }

  protected override advancePhase(now: number): boolean {
    const changed = super.advancePhase(now);
    if (changed) this.nextSummonAt = now + FIRST_SUMMON_MS;
    return changed;
  }

  protected override act(player: Player, now: number): void {
    const dir = this.dirTo(player);
    if (this.phase === 0) {
      this.playAnim('move');
      this.chase(player, this.def.spd, 56);
      if (now < this.nextSummonAt) return;
      this.nextSummonAt = now + DRONE_INTERVAL_MS;
      for (const dx of [-DRONE_DX, DRONE_DX]) {
        if (this.minionsAlive >= MAX_MINIONS) break;
        this.spawnMinion(this.def.minion ?? DRONE_ID, this.x + dx, this.y);
      }
      return;
    }
    if (this.phase === 1) {
      this.playAnim('move');
      this.setFlipX(dir === 1);
      this.dash(dir, now, 460, 500, DASH_INTERVAL_MS);
      return;
    }
    this.playAnim('idle');
    this.setVelocityX(0);
    this.setFlipX(dir === 1);
    if (now >= this.nextActionAt) {
      this.fireBothWays(300, 480);
      this.nextActionAt = now + WAVE_INTERVAL_MS;
    }
    if (now >= this.nextSummonAt) {
      this.nextSummonAt = now + TRAP_INTERVAL_MS;
      // 트랩은 플레이어 옆(96~160px)에 놓는다 — 발밑에 바로 두면 피할 수 없다.
      const side = Math.random() < 0.5 ? -1 : 1;
      if (this.minionsAlive < MAX_MINIONS) this.spawnMinion(TRAP_ID, player.x + side * (96 + Math.random() * 64), this.y);
    }
  }
}
