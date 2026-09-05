import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import { getEnemy, getItem } from '../data/index';
import type { SkillDef, SkillEffect } from '../data/schema';
import { Boss } from '../entities/Boss';
import { DropItem } from '../entities/DropItem';
import { Enemy } from '../entities/Enemy';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import type { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { calculateDamage } from '../systems/combat';
import { addItem } from '../systems/inventory';
import { canCast, cast, skillLevelOf, skillMultiplier } from '../systems/skills';
import { STAT_KEYS, type StatKey, type Stats } from '../systems/types';
import { damagePopup, floatText } from '../ui/FloatText';

interface Buff { stat: StatKey; ratio: number; until: number }
interface SpawnRecord { id: string; x: number; y: number; respawnMs: number }

const CONTACT_IFRAMES_MS = 600;

export class CombatController {
  readonly enemies: Phaser.Physics.Arcade.Group;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly drops: Phaser.Physics.Arcade.Group;
  readonly enemyProjectiles: Phaser.Physics.Arcade.Group;
  boss: Boss | null = null;
  buffs: Buff[] = [];
  counterUntil = 0;
  counterMultiplier = 1;
  onPlayerDied: () => void = () => {};

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly gs: GameState,
    private readonly solids: Phaser.Tilemaps.TilemapLayer[],
  ) {
    this.enemies = scene.physics.add.group();
    this.projectiles = scene.physics.add.group();
    this.drops = scene.physics.add.group();
    this.enemyProjectiles = scene.physics.add.group();
    // Phaser.Physics.Arcade.Group re-applies its `defaults` (allowGravity: true, velocityX/Y:
    // 0, ...) to every member on add() -- even one whose body is already configured -- which
    // would silently stomp EnemyProjectile's own setAllowGravity(false)/setVelocityX() the
    // instant spawnBoss() adds it to this group, turning every shot into a dead drop instead
    // of a horizontal shot. Clearing `defaults` (Phaser's own documented escape hatch) leaves
    // each projectile's own constructor-set body state alone.
    this.enemyProjectiles.defaults = {} as Phaser.Types.Physics.Arcade.PhysicsGroupDefaults;
    scene.physics.add.overlap(player, this.enemyProjectiles, (_p, ep) => this.onEnemyProjectile(ep as EnemyProjectile));
    for (const layer of solids) {
      scene.physics.add.collider(this.enemies, layer);
      scene.physics.add.collider(this.drops, layer);
    }
    scene.physics.add.overlap(player, this.enemies, (_p, e) => this.onContact(e as Enemy));
    scene.physics.add.overlap(this.projectiles, this.enemies, (p, e) => this.onProjectileHit(p as Projectile, e as Enemy));
    scene.physics.add.overlap(player, this.drops, (_p, d) => this.collect(d as DropItem));
  }

  // ---------- 스탯 ----------

  effectiveStats(): Stats {
    const now = this.scene.time.now;
    this.buffs = this.buffs.filter((b) => b.until > now);
    const s = this.gs.maxStats();
    for (const k of STAT_KEYS) {
      const ratio = this.buffs.filter((b) => b.stat === k).reduce((acc, b) => acc + b.ratio, 0);
      if (ratio !== 0) s[k] = Math.round(s[k] * (1 + ratio));
    }
    return s;
  }

  // ---------- 스폰 ----------

  spawnEnemy(id: string, x: number, y: number, respawnMs = 8000): Enemy {
    const enemy = new Enemy(this.scene, x, y, getEnemy(id));
    enemy.setData('spawn', { id, x, y, respawnMs } satisfies SpawnRecord);
    this.enemies.add(enemy);
    return enemy;
  }

  spawnBoss(id: string, x: number, y: number): Boss {
    const boss = new Boss(this.scene, x, y, getEnemy(id));
    boss.setData('spawn', { id, x, y, respawnMs: 0 } satisfies SpawnRecord);
    boss.fire = (fx, fy, dir, speed, range, mult) => this.enemyProjectiles.add(new EnemyProjectile(this.scene, fx, fy, dir, speed, range, boss.stats(), mult));
    boss.onPhaseChange = (_phase, name) => floatText(this.scene, boss.x, boss.y - boss.def.height - 20, name, '#bb9af7', 18);
    this.enemies.add(boss);
    this.boss = boss;
    floatText(this.scene, boss.x, boss.y - boss.def.height - 20, '1라운드: 보컬', '#bb9af7', 18);
    return boss;
  }

  private hasFloor = (x: number, y: number): boolean =>
    this.solids.some((layer) => { const t = layer.getTileAtWorldXY(x, y); return !!t && t.index > 0; });

  // ---------- 스킬 ----------

  castSkill(skill: SkillDef): boolean {
    const now = this.scene.time.now;
    const check = canCast(skill, this.gs.player, this.gs.skillRuntime, now);
    if (!check.ok) {
      if (check.reason === 'mp') floatText(this.scene, this.player.x, this.player.y - 60, '기력 부족', '#7aa2f7');
      return false;
    }
    const r = cast(skill, this.gs.player, this.gs.skillRuntime, now);
    this.gs.player = r.player;
    this.gs.skillRuntime = r.rt;
    this.gs.bus.emit('changed', undefined);

    const attached = skill.effects.filter((e): e is Extract<SkillEffect, { kind: 'dot' | 'debuff' }> => e.kind === 'dot' || e.kind === 'debuff');
    for (const effect of skill.effects) {
      switch (effect.kind) {
        case 'melee':
          this.meleeHit(skill, effect.width, effect.height, effect.knockback, !!effect.centered, attached, null);
          break;
        case 'stun':
          this.meleeHit(skill, effect.width, effect.height, 0, false, attached, now + effect.durationMs);
          break;
        case 'projectile':
          this.projectiles.add(new Projectile(this.scene, this.player.x + this.player.facing * 18, this.player.y - 28, this.player.facing, skill, effect.speed, effect.range, effect.pierce));
          break;
        case 'buff':
          this.buffs.push({ stat: effect.stat, ratio: effect.ratio, until: now + effect.durationMs });
          floatText(this.scene, this.player.x, this.player.y - 60, skill.name, '#9ece6a');
          break;
        case 'heal': {
          const max = this.gs.maxStats();
          this.gs.heal(Math.floor(max.hp * effect.ratio), 0);
          floatText(this.scene, this.player.x, this.player.y - 60, `+${Math.floor(max.hp * effect.ratio)}`, '#9ece6a');
          break;
        }
        case 'counter':
          this.counterUntil = now + effect.windowMs;
          this.counterMultiplier = effect.multiplier;
          floatText(this.scene, this.player.x, this.player.y - 60, skill.name, '#bb9af7');
          break;
        case 'dot':
        case 'debuff':
          break; // 전달 효과에 부착되어 적용된다
      }
    }
    return true;
  }

  private meleeHit(skill: SkillDef, width: number, height: number, knockback: number, centered: boolean, attached: Extract<SkillEffect, { kind: 'dot' | 'debuff' }>[], stunUntil: number | null): void {
    const f = this.player.facing;
    const left = centered ? this.player.x - width / 2 : f === 1 ? this.player.x : this.player.x - width;
    const rect = new Phaser.Geom.Rectangle(left, this.player.y - height, width, height);
    const flash = this.scene.add.rectangle(rect.centerX, rect.centerY, width, height, 0xffffff, 0.25).setDepth(9);
    this.scene.time.delayedCall(100, () => flash.destroy());
    for (const obj of [...this.enemies.getChildren()]) {
      const enemy = obj as Enemy;
      if (!enemy.active || !Phaser.Geom.Intersects.RectangleToRectangle(rect, enemy.getBounds())) continue;
      const dir = enemy.x >= this.player.x ? 1 : -1;
      this.hitEnemy(enemy, skill, dir * knockback, attached, stunUntil);
    }
  }

  private onProjectileHit(p: Projectile, enemy: Enemy): void {
    if (!p.active || !enemy.active || p.hitSet.has(enemy)) return;
    p.hitSet.add(enemy);
    const attached = p.skill.effects.filter((e): e is Extract<SkillEffect, { kind: 'dot' | 'debuff' }> => e.kind === 'dot' || e.kind === 'debuff');
    this.hitEnemy(enemy, p.skill, Math.sign(p.body.velocity.x) * 60, attached, null);
    if (!p.pierce) p.destroy();
  }

  private hitEnemy(enemy: Enemy, skill: SkillDef, knockbackX: number, attached: Extract<SkillEffect, { kind: 'dot' | 'debuff' }>[], stunUntil: number | null): void {
    if (this.scene.time.now < enemy.invulnerableUntil) {
      floatText(this.scene, enemy.x, enemy.y - enemy.def.height, 'MISS', '#a9b1d6', 12);
      return;
    }
    const now = this.scene.time.now;
    const mult = skillMultiplier(skill, skillLevelOf(this.gs.player, skill.id));
    const dmg = calculateDamage(this.effectiveStats(), enemy.stats(), mult, Math.random);
    damagePopup(this.scene, enemy.x, enemy.y - enemy.def.height, dmg.amount, dmg.crit);
    if (stunUntil !== null) enemy.applyStun(stunUntil);
    for (const a of attached) {
      if (a.kind === 'debuff') enemy.applyDebuff(a.stat, a.ratio, now + a.durationMs);
      if (a.kind === 'dot') enemy.applyDot(dmg.amount, a.ticks, a.intervalMs, now);
    }
    if (enemy.takeHit(dmg.amount, knockbackX)) this.killEnemy(enemy);
  }

  // ---------- 적 처리 ----------

  private killEnemy(enemy: Enemy): void {
    const def = enemy.def;
    const spawn = enemy.getData('spawn') as SpawnRecord;
    const x = enemy.x, y = enemy.y - def.height / 2;
    this.enemies.remove(enemy, true, true);

    const hearts = Phaser.Math.Between(def.hearts[0], def.hearts[1]);
    if (hearts > 0) this.drops.add(new DropItem(this.scene, x, y, 'hearts', hearts));
    for (const d of def.drops) if (Math.random() < d.chance) this.drops.add(new DropItem(this.scene, x + Phaser.Math.Between(-10, 10), y, 'item', 1, d.itemId));

    const levels = this.gs.gainXp(def.xp);
    floatText(this.scene, x, y - 20, `+${def.xp} EXP`, '#7dcfff', 12);
    if (levels > 0) floatText(this.scene, this.player.x, this.player.y - 80, `LEVEL UP! Lv.${this.gs.player.level}`, '#ffd166', 20);
    this.gs.report({ type: 'enemy_killed', enemyId: def.id });

    if (def.ai === 'boss') {
      this.gs.flags.add(`boss_${def.id}_defeated`);
      this.boss = null;
      for (const ep of this.enemyProjectiles.getChildren()) ep.destroy();
    }

    if (def.ai !== 'boss' && spawn.respawnMs > 0) {
      this.scene.time.delayedCall(spawn.respawnMs, () => { if (this.scene.scene.isActive()) this.spawnEnemy(spawn.id, spawn.x, spawn.y, spawn.respawnMs); });
    }
  }

  private collect(d: DropItem): void {
    if (!d.active) return;
    this.drops.remove(d, true, true);
    if (d.kind === 'hearts') {
      this.gs.addHearts(d.amount);
      floatText(this.scene, this.player.x, this.player.y - 60, `+${d.amount} ♥`, '#f7768e', 12);
    } else if (d.itemId) {
      this.gs.inventory = addItem(this.gs.inventory, d.itemId, d.amount);
      this.gs.report({ type: 'item_collected', itemId: d.itemId, count: d.amount });
      this.gs.bus.emit('changed', undefined);
      floatText(this.scene, this.player.x, this.player.y - 60, getItem(d.itemId).name, '#e0af68', 12);
    }
  }

  private onContact(enemy: Enemy): void {
    const now = this.scene.time.now;
    if (!enemy.active || now < this.player.invulnerableUntil || now < enemy.stunnedUntil) return;
    const dir = this.player.x < enemy.x ? -1 : 1;

    if (now < this.counterUntil) {
      this.counterUntil = 0;
      const dmg = calculateDamage(this.effectiveStats(), enemy.stats(), this.counterMultiplier, Math.random);
      damagePopup(this.scene, enemy.x, enemy.y - enemy.def.height, dmg.amount, true);
      floatText(this.scene, this.player.x, this.player.y - 70, '카운터!', '#bb9af7', 16);
      if (enemy.takeHit(dmg.amount, -dir * 300)) this.killEnemy(enemy);
      this.player.invulnerableUntil = now + CONTACT_IFRAMES_MS;
      return;
    }

    const dmg = calculateDamage(enemy.stats(), this.effectiveStats(), 1, Math.random);
    damagePopup(this.scene, this.player.x, this.player.y - 56, dmg.amount, dmg.crit, true);
    this.player.invulnerableUntil = now + CONTACT_IFRAMES_MS;
    this.player.setVelocity(dir * 220, -200);
    this.scene.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, repeat: 3, duration: 75, onComplete: () => this.player.setAlpha(1) });
    if (this.gs.takeDamage(dmg.amount)) this.onPlayerDied();
  }

  private onEnemyProjectile(ep: EnemyProjectile): void {
    if (!ep.active) return;
    const now = this.scene.time.now;
    if (now < this.player.invulnerableUntil) return;
    const knockbackDir = Math.sign(ep.body.velocity.x);
    ep.destroy();
    if (now < this.counterUntil && this.boss) {
      this.counterUntil = 0;
      const dmg = calculateDamage(this.effectiveStats(), this.boss.stats(), this.counterMultiplier, Math.random);
      damagePopup(this.scene, this.boss.x, this.boss.y - this.boss.def.height, dmg.amount, true);
      floatText(this.scene, this.player.x, this.player.y - 70, '카운터!', '#bb9af7', 16);
      if (this.boss.takeHit(dmg.amount)) this.killEnemy(this.boss);
      this.player.invulnerableUntil = now + CONTACT_IFRAMES_MS;
      return;
    }
    const dmg = calculateDamage(ep.attacker, this.effectiveStats(), ep.multiplier, Math.random);
    damagePopup(this.scene, this.player.x, this.player.y - 56, dmg.amount, dmg.crit, true);
    this.player.invulnerableUntil = now + CONTACT_IFRAMES_MS;
    this.player.setVelocity(knockbackDir * 200, -160);
    if (this.gs.takeDamage(dmg.amount)) this.onPlayerDied();
  }

  // ---------- 프레임 ----------

  update(now: number): void {
    for (const obj of [...this.enemies.getChildren()]) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      enemy.updateAi(this.player, now, this.hasFloor);
      for (const amount of enemy.tickDots(now)) {
        damagePopup(this.scene, enemy.x, enemy.y - enemy.def.height, amount, false);
        if (enemy.takeHit(amount, 0)) { this.killEnemy(enemy); break; }
      }
    }
  }
}
