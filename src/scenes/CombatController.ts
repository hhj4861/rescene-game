import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';
import type { RunStore } from '../core/RunStore';
import { sfx } from '../audio/audioSession';
import { getEnemy, getMember, getSkill } from '../data/index';
import type { MemberDef } from '../data/schema';
import { Boss } from '../entities/Boss';
import { DropItem, type Drop } from '../entities/DropItem';
import { Enemy } from '../entities/Enemy';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import type { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { SUPER_TOTAL_MS, SuperFx } from './SuperFx';

/** 씬(WorldScene)이 구현하는 접착 훅. */
export interface CombatHooks {
  /** 웨이브 카운트(SectionController.enemyDied). 보스는 제외. */
  onEnemyDied(now: number): void;
  /** 보스 사망 → 스테이지 클리어. */
  onBossKilled(): void;
  /** 피격 시 노히트 플래그를 위해. */
  isBossSection(): boolean;
  /** 카드 드랍 id(cardPool 에서 아직 안 가진 것 우선). 없으면 null. */
  nextCardId(): string | null;
  onHeartPicked(): void;
  onCardPicked(memeId: string): void;
}

const CHAIN_WINDOW_MS = 600;
const ATTACK_MIN_INTERVAL_MS = 120;
const CHAIN3_MULT = 1.6;
const CHAIN3_KNOCKBACK = 2;
const PROJECTILE_KNOCKBACK = 60;
const HIT_IFRAMES_MS = 1000;
const CONTACT_HEARTS = 1;
const BOSS_HEARTS = 2;
const SUPER_BUFF_RATIO = 0.2;
const SUPER_PROJECTILE_RANGE = 1200;
const SUPER_STUN_MS = 1000;
const SUPER_KNOCKBACK_MULT = 1.5;

/** 체인 공격·게이지·엘리트·드랍·필살기. 성장·인벤토리·경험치는 없다. */
export class CombatController {
  readonly enemies: Phaser.Physics.Arcade.Group;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly drops: Phaser.Physics.Arcade.Group;
  readonly enemyProjectiles: Phaser.Physics.Arcade.Group;
  boss: Boss | null = null;
  private chainStep = 0;
  private lastAttackAt = -Infinity;
  private atkBuffUntil = 0;
  private readonly member: MemberDef;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly run: RunStore,
    private readonly solids: Phaser.Tilemaps.TilemapLayer[],
    private readonly hooks: CombatHooks,
  ) {
    this.member = getMember(run.state.member);
    this.enemies = scene.physics.add.group();
    this.projectiles = scene.physics.add.group();
    this.drops = scene.physics.add.group();
    this.enemyProjectiles = scene.physics.add.group();
    // Arcade.Group.add() 는 `defaults`(allowGravity 등)를 멤버마다 다시 적용해 생성자에서 맞춘 바디
    // 설정을 덮어쓴다. 그룹마다 defaults 를 비워 각 엔티티의 설정을 그대로 둔다(v0.1 교훈).
    for (const g of [this.enemies, this.projectiles, this.drops, this.enemyProjectiles]) {
      g.defaults = {} as Phaser.Types.Physics.Arcade.PhysicsGroupDefaults;
    }
    for (const layer of solids) {
      scene.physics.add.collider(this.enemies, layer);
      scene.physics.add.collider(this.drops, layer);
    }
    scene.physics.add.overlap(player, this.enemies, (_p, e) => this.onContact(e as Enemy));
    scene.physics.add.overlap(player, this.enemyProjectiles, (_p, ep) => this.onEnemyProjectile(ep as EnemyProjectile));
    scene.physics.add.overlap(this.projectiles, this.enemies, (p, e) => this.onProjectileHit(p as Projectile, e as Enemy));
    scene.physics.add.overlap(player, this.drops, (_p, d) => this.collect(d as DropItem));
  }

  // ---------- 데미지 ----------

  /** 데미지 = max(1, round((atk + 카드 atk) × 배율)). 방어·치명타 없음. 필살기 뒤 8초는 +20%. */
  damage(multiplier: number): number {
    const atk = this.member.atk + this.run.buffs.atk;
    const buff = this.scene.time.now < this.atkBuffUntil ? 1 + SUPER_BUFF_RATIO : 1;
    return Math.max(1, Math.round(atk * multiplier * buff));
  }

  // ---------- 스폰 ----------

  spawnEnemy(id: string, x: number, y: number, elite = false): Enemy {
    const enemy = new Enemy(this.scene, x, y, getEnemy(id));
    if (elite) enemy.makeElite();
    this.enemies.add(enemy);
    return enemy;
  }

  spawnBoss(id: string, x: number, y: number): Boss {
    const boss = new Boss(this.scene, x, y, getEnemy(id));
    boss.fire = (fx, fy, dir, speed, range) => this.enemyProjectiles.add(new EnemyProjectile(this.scene, fx, fy, dir, speed, range, BOSS_HEARTS));
    this.enemies.add(boss);
    this.boss = boss;
    return boss;
  }

  dropAt(x: number, y: number, drop: Drop): void {
    this.drops.add(new DropItem(this.scene, x, y, drop));
  }

  private hasFloor = (x: number, y: number): boolean =>
    this.solids.some((layer) => { const t = layer.getTileAtWorldXY(x, y); return !!t && t.index > 0; });

  // ---------- 공격 ----------

  /** A. 0.6초 안에 연타하면 1→2→3타 체인. 3타는 배율 1.6·넉백 2배. */
  attack(now: number): boolean {
    if (now - this.lastAttackAt < ATTACK_MIN_INTERVAL_MS) return false;
    this.chainStep = now - this.lastAttackAt <= CHAIN_WINDOW_MS ? (this.chainStep % 3) + 1 : 1;
    this.lastAttackAt = now;
    this.player.playAttack();
    const skill = getSkill(this.member.basicSkill);
    const third = this.chainStep === 3;
    const dmg = this.damage(skill.multiplier * (third ? CHAIN3_MULT : 1));
    const kb = third ? CHAIN3_KNOCKBACK : 1;
    for (const effect of skill.effects) {
      if (effect.kind === 'melee') this.meleeHit(effect.width, effect.height, !!effect.centered, dmg, effect.knockback * kb, third, now);
      else if (effect.kind === 'projectile') this.shoot({ damage: dmg, speed: effect.speed, range: effect.range, pierce: effect.pierce, knockback: PROJECTILE_KNOCKBACK * kb, strong: third });
    }
    return true;
  }

  private shoot(spec: Projectile['spec']): void {
    const f = this.player.facing;
    this.projectiles.add(new Projectile(this.scene, this.player.x + f * 18, this.player.y - 28, f, spec));
  }

  private meleeHit(width: number, height: number, centered: boolean, dmg: number, knockback: number, strong: boolean, now: number): void {
    const f = this.player.facing;
    const left = centered ? this.player.x - width / 2 : f === 1 ? this.player.x : this.player.x - width;
    const rect = new Phaser.Geom.Rectangle(left, this.player.y - height, width, height);
    const flash = this.scene.add.rectangle(rect.centerX, rect.centerY, width, height, 0xffffff, strong ? 0.4 : 0.25).setDepth(9);
    this.scene.time.delayedCall(100, () => flash.destroy());
    for (const obj of [...this.enemies.getChildren()]) {
      const enemy = obj as Enemy;
      if (!enemy.active || !Phaser.Geom.Intersects.RectangleToRectangle(rect, enemy.getBounds())) continue;
      const dir = enemy.x >= this.player.x ? 1 : -1;
      this.hitEnemy(enemy, dmg, dir * knockback, now, strong);
    }
  }

  private onProjectileHit(p: Projectile, enemy: Enemy): void {
    if (!p.active || !enemy.active || p.hitSet.has(enemy)) return;
    p.hitSet.add(enemy);
    const now = this.scene.time.now;
    const dir = Math.sign(p.body.velocity.x) || 1;
    this.hitEnemy(enemy, p.spec.damage, dir * (p.spec.knockback ?? 0), now, !!p.spec.strong, p.spec.stunMs);
    if (!p.spec.pierce) p.destroy();
  }

  /** 타격 1회: 게이지 +4, 스파크, 넉백. 죽으면 처치 처리. */
  private hitEnemy(enemy: Enemy, dmg: number, knockbackX: number, now: number, strong: boolean, stunMs = 0): void {
    if (!enemy.active || now < enemy.invulnerableUntil) return;
    this.run.hit();
    sfx(this.scene, strong ? 'hit3' : 'hit');
    this.spark(enemy.x, enemy.y - enemy.displayHeight / 2, strong);
    if (stunMs > 0) enemy.applyStun(now + stunMs);
    if (enemy.takeHit(dmg, knockbackX)) this.killEnemy(enemy, now);
  }

  /** 데미지 숫자 대신 타격 스파크만 남긴다(스펙 §8). */
  private spark(x: number, y: number, strong: boolean): void {
    const s = this.scene.add.image(x, y, TEX.hit).setDepth(20).setScale(strong ? 2 : 1.2).setAngle(Phaser.Math.Between(0, 90));
    this.scene.tweens.add({ targets: s, scale: strong ? 5 : 3, alpha: 0, duration: 140, ease: 'Cubic.easeOut', onComplete: () => s.destroy() });
  }

  // ---------- 처치 ----------

  /** 즉시 처치(개발용 훅·필살기 등). 처치 규칙은 killEnemy 와 같다. */
  slay(enemy: Enemy): void {
    if (enemy.active) this.killEnemy(enemy, this.scene.time.now);
  }

  private killEnemy(enemy: Enemy, now: number): void {
    const def = enemy.def;
    const elite = enemy.elite;
    const x = enemy.x;
    const y = enemy.y - enemy.displayHeight / 2;
    this.enemies.remove(enemy, true, true);

    if (def.ai === 'boss') {
      this.boss = null;
      for (const ep of [...this.enemyProjectiles.getChildren()]) ep.destroy();
      this.run.bossKilled();
      sfx(this.scene, 'elite');
      this.hooks.onBossKilled();
      return;
    }

    this.run.kill(def.score, now, elite);
    sfx(this.scene, elite ? 'elite' : 'kill');
    if (elite) {
      const id = this.hooks.nextCardId();
      if (id) this.dropAt(x, y, { kind: 'card', memeId: id });
    } else if (Math.random() < def.heartChance) {
      this.dropAt(x, y, { kind: 'heart', member: this.run.state.member });
    }
    this.hooks.onEnemyDied(now);
  }

  /** 바닥의 아이템을 전부 줍는다(개발용 훅). */
  pickupAll(): void {
    for (const d of [...this.drops.getChildren()]) this.collect(d as DropItem);
  }

  private collect(d: DropItem): void {
    if (!d.active) return;
    this.drops.remove(d, true, true);
    if (d.drop.kind === 'heart') {
      this.run.heal(1);
      this.hooks.onHeartPicked();
    } else {
      this.run.pickCard(d.drop.memeId);
      this.hooks.onCardPicked(d.drop.memeId);
    }
  }

  // ---------- 피격 ----------

  private onContact(enemy: Enemy): void {
    const now = this.scene.time.now;
    if (!enemy.active || now < enemy.stunnedUntil) return;
    const dir = this.player.x < enemy.x ? -1 : 1;
    this.hurt(enemy.def.ai === 'boss' ? BOSS_HEARTS : CONTACT_HEARTS, dir, now);
  }

  private onEnemyProjectile(ep: EnemyProjectile): void {
    if (!ep.active) return;
    const now = this.scene.time.now;
    if (now < this.player.invulnerableUntil) return;
    const dir = (Math.sign(ep.body.velocity.x) || 1) as 1 | -1;
    ep.destroy();
    this.hurt(ep.damage, dir, now);
  }

  /** 하트 -n, 1초 무적 점멸, 넉백. 보스 구간이면 노히트 플래그를 끈다. */
  private hurt(hearts: number, dir: 1 | -1, now: number): void {
    if (now < this.player.invulnerableUntil || this.run.state.hearts <= 0) return;
    if (this.hooks.isBossSection()) this.run.markBossHit();
    this.player.playHurt();
    this.player.invulnerableUntil = now + HIT_IFRAMES_MS;
    this.player.setVelocity(dir * 220, -200);
    this.scene.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, repeat: 6, duration: 70, onComplete: () => this.player.setAlpha(1) });
    sfx(this.scene, 'hurt');
    this.run.takeHit(hearts);
  }

  // ---------- 필살기 ----------

  /** S. 게이지 100% 면 연출 후 효과. 연출 중 플레이어는 무적. */
  castSuper(now: number, onDone: () => void): boolean {
    if (!this.run.useSuper()) return false;
    this.player.invulnerableUntil = Math.max(this.player.invulnerableUntil, now + SUPER_TOTAL_MS + 200);
    this.player.setVelocity(0, 0);
    SuperFx.play(this.scene, this.member, () => this.applySuper(), onDone);
    return true;
  }

  /** superSkill 의 effects 를 스펙 §5 범위로 실행: melee → 화면 안 전부, projectile → 관통 1발, dot → 화면 안 전부, buff → 8초. */
  private applySuper(): void {
    const now = this.scene.time.now;
    const skill = getSkill(this.member.superSkill);
    const dmg = this.damage(skill.multiplier);
    const targets = this.enemiesOnScreen();
    for (const effect of skill.effects) {
      switch (effect.kind) {
        case 'melee':
          for (const e of targets) this.hitEnemy(e, dmg, (e.x >= this.player.x ? 1 : -1) * effect.knockback * SUPER_KNOCKBACK_MULT, now, true);
          break;
        case 'projectile':
          this.shoot({ damage: dmg, speed: effect.speed, range: SUPER_PROJECTILE_RANGE, pierce: true, knockback: PROJECTILE_KNOCKBACK * 2, stunMs: SUPER_STUN_MS, strong: true });
          break;
        case 'dot':
          for (const e of targets) e.applyDot(dmg, effect.ticks, effect.intervalMs, now);
          break;
        case 'buff':
          if (effect.stat === 'atk') this.atkBuffUntil = now + effect.durationMs;
          break;
        default:
          break; // stun·counter·heal·debuff 는 아케이드 필살기에서 쓰지 않는다
      }
    }
  }

  private enemiesOnScreen(): Enemy[] {
    const view = this.scene.cameras.main.worldView;
    return [...this.enemies.getChildren()]
      .map((o) => o as Enemy)
      .filter((e) => e.active && Phaser.Geom.Intersects.RectangleToRectangle(view, e.getBounds()));
  }

  // ---------- 프레임 ----------

  update(now: number): void {
    for (const obj of [...this.enemies.getChildren()]) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      enemy.updateAi(this.player, now, this.hasFloor);
      for (const amount of enemy.tickDots(now)) {
        this.spark(enemy.x, enemy.y - enemy.displayHeight / 2, false);
        if (enemy.takeHit(amount, 0)) { this.killEnemy(enemy, now); break; }
      }
    }
  }
}
