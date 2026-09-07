import { Enemy } from './Enemy';
import type { Player } from './Player';

export interface BossPhase { hpRatio: number; name: string }

/** 기믹이 닫힌 보스를 때렸을 때의 튕김 색(HUD 무적 표시와 같은 회색). */
export const DEFLECT_TINT = 0x9aa3c7;
const PHASE_GUARD_MS = 800;

/**
 * 보스: 데이터의 `phases`(체력 비율 내림차순)로 라운드를 바꾼다. 넉백을 받지 않는다.
 * 기믹 보스(entities/bosses/*)는 `act`·알림 훅·`invulnerable` 을 덮어쓴다. 기본 구현은 전부 no-op/false.
 */
export class Boss extends Enemy {
  /** 현재 페이즈 인덱스(0부터). */
  phase = 0;
  onPhaseChange: (phase: number, name: string) => void = () => {};
  fire: (x: number, y: number, dir: 1 | -1, speed: number, range: number) => void = () => {};
  /** 잡몹 소환(침묵·트로피). CombatController 가 연결한다(발 위치, 바운드 안으로 클램프). */
  spawnMinion: (enemyId: string, x: number, y: number) => void = () => {};
  /** 이 보스가 부른 잡몹 중 살아 있는 수. CombatController 가 센다. */
  minionsAlive = 0;
  protected nextActionAt = 0;
  protected dashUntil = 0;

  get phases(): BossPhase[] {
    return this.def.phases ?? [{ hpRatio: 1, name: this.def.name }];
  }

  phaseName(): string {
    return this.phases[this.phase]?.name ?? this.def.name;
  }

  // ---------- 기믹 훅(기본 no-op) ----------

  /** 플레이어 3타 체인 완료(렌즈). */
  notifyChainFinished(): void {}
  /** 소환 잡몹 처치(침묵). */
  notifyMinionKilled(enemyId: string): void { void enemyId; }
  /** 기본 공격(카피캣). */
  notifyPlayerAttack(kind: 'melee' | 'projectile'): void { void kind; }
  /** 필살기(카피캣 경직). */
  notifySuper(): void {}
  /** 기믹이 닫혀 있으면 true: takeHit 는 피해 0 + 튕김, HUD 는 회색 "무적". */
  get invulnerable(): boolean {
    return false;
  }
  /** 렌즈 열림·약점 노출처럼 "지금 때려라" 순간이면 true(HUD "지금!" 깜빡임). */
  get exposed(): boolean {
    return false;
  }

  // ---------- 피해 ----------

  /** 넉백 없음. 불사 상태면 피해 0, 회색 튕김만 남기고 false. */
  override takeHit(amount: number): boolean {
    if (this.invulnerable) {
      this.deflect();
      return false;
    }
    return super.takeHit(amount, 0);
  }

  protected deflect(): void {
    this.setTintFill(DEFLECT_TINT);
    this.scene.time.delayedCall(70, () => { if (this.active) this.restoreTint(); });
  }

  // ---------- 프레임 ----------

  /** 체력 비율 이하인 마지막 페이즈. phases[0].hpRatio 는 1 이라 항상 0 이상. */
  private phaseFor(ratio: number): number {
    let idx = 0;
    this.phases.forEach((p, i) => { if (ratio <= p.hpRatio) idx = i; });
    return idx;
  }

  override updateAi(player: Player, now: number): void {
    if (this.advancePhase(now)) return;
    if (now < this.stunnedUntil) {
      this.setVelocityX(0);
      this.playAnim('idle');
      return;
    }
    this.act(player, now);
  }

  /** 페이즈 전환 프레임: 0.8초 무적·행동 정지 후 onPhaseChange. 전환했으면 true. */
  protected advancePhase(now: number): boolean {
    const target = this.phaseFor(this.hp / this.maxHp);
    if (target === this.phase) return false;
    this.phase = target;
    this.invulnerableUntil = now + PHASE_GUARD_MS;
    this.nextActionAt = now + PHASE_GUARD_MS;
    this.dashUntil = 0;
    this.setVelocityX(0);
    this.onPhaseChange(target, this.phaseName());
    return true;
  }

  /** 기본 보스 행동(월말평가·문지기): 1라운드 접근+탄, 2라운드 돌진, 3라운드 제자리 양방향 탄. */
  protected act(player: Player, now: number): void {
    this.playAnim(this.phase >= 2 ? 'idle' : 'move');
    const dir = this.dirTo(player);
    if (this.phase === 0) {
      this.chase(player, this.def.spd);
      if (now >= this.nextActionAt) {
        this.fireForward(dir, 260, 480);
        this.nextActionAt = now + 2000;
      }
    } else if (this.phase === 1) {
      this.setFlipX(dir === 1);
      this.dash(dir, now, 420, 600, 2500);
    } else {
      this.setVelocityX(0);
      if (now >= this.nextActionAt) {
        this.fireBothWays(300, 420);
        this.nextActionAt = now + 1800;
      }
    }
  }

  // ---------- 행동 부품(기믹 보스 공용) ----------

  protected dirTo(player: Player): 1 | -1 {
    return player.x < this.x ? -1 : 1;
  }

  /** 플레이어 쪽으로 이동(stopDist 안이면 정지). 바라보는 방향도 맞춘다. */
  protected chase(player: Player, speed: number, stopDist = 40): void {
    const dir = this.dirTo(player);
    this.setFlipX(dir === 1);
    this.setVelocityX(Math.abs(player.x - this.x) > stopDist ? dir * speed : 0);
  }

  /** 돌진: nextActionAt 이 되면 dir 로 durationMs 동안 speed, 그 뒤 intervalMs 마다 반복. 돌진 중이면 true. */
  protected dash(dir: 1 | -1, now: number, speed: number, durationMs: number, intervalMs: number): boolean {
    if (now < this.dashUntil) return true;
    if (now >= this.nextActionAt) {
      this.setVelocityX(dir * speed);
      this.dashUntil = now + durationMs;
      this.nextActionAt = now + intervalMs;
      return true;
    }
    this.setVelocityX(0);
    return false;
  }

  /** 정면 탄 1발(몸통 가운데 높이). */
  protected fireForward(dir: 1 | -1, speed: number, range: number): void {
    this.fire(this.x + dir * 40, this.y - this.def.height / 2, dir, speed, range);
  }

  /** 양방향 탄(발 근처 충격파). */
  protected fireBothWays(speed: number, range: number): void {
    this.fire(this.x - 40, this.y - 8, -1, speed, range);
    this.fire(this.x + 40, this.y - 8, 1, speed, range);
  }
}
