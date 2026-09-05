import Phaser from 'phaser';
import { SCENE, TEX, mapKey } from '../core/AssetKeys';
import { getSession, type Session } from '../core/session';
import { getItem, getMap, getMember, getMeme, getNpc, getSkill, hasItem } from '../data/index';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { Portal } from '../entities/Portal';
import { ScentSavePoint } from '../entities/ScentSavePoint';
import { removeItem } from '../systems/inventory';
import { passiveTotals } from '../systems/memes';
import { DEFAULT_MOVE_CONFIG, type MoveConfig } from '../systems/movement';
import { markerFor, pickNpcAction } from '../systems/npcInteraction';
import { saveGame } from '../systems/save';
import type { Reward } from '../data/schema';
import type { Boss } from '../entities/Boss';
import { floatText } from '../ui/FloatText';
import { SMALL_TEXT } from '../ui/textStyles';
import { CombatController } from './CombatController';
import type { CutsceneData } from './CutsceneScene';
import type { DialogueData } from './DialogueScene';
import { findSpawn, objectsOf } from './worldObjects';

export interface WorldData {
  mapId: string;
  spawnId: string;
}

export class WorldScene extends Phaser.Scene {
  private mapId = '';
  private spawnId = 'start';
  private session!: Session;
  private map!: Phaser.Tilemaps.Tilemap;
  private ladders!: Phaser.Tilemaps.TilemapLayer;
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private portals: Portal[] = [];
  private portalLabels = new Map<Portal, Phaser.GameObjects.Text>();
  private unsubChanged: (() => void) | null = null;
  private savepoints: ScentSavePoint[] = [];
  private npcs: Npc[] = [];
  private transitioning = false;
  private combat!: CombatController;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyF!: Phaser.Input.Keyboard.Key;
  private mpRegenAcc = 0;

  constructor() {
    super(SCENE.world);
  }

  init(data: WorldData): void {
    this.mapId = data.mapId;
    this.spawnId = data.spawnId ?? 'start';
  }

  create(): void {
    this.transitioning = false;
    this.portalLabels.clear();
    this.session = getSession(this);
    const gs = this.session.gs;

    this.map = this.make.tilemap({ key: mapKey(this.mapId) });
    const tiles = this.map.addTilesetImage('tiles', TEX.tiles)!;
    const ground = this.map.createLayer('ground', tiles, 0, 0)!;
    ground.setCollisionByExclusion([-1, 0]);
    const platforms = this.map.createLayer('platforms', tiles, 0, 0)!;
    platforms.setCollisionByExclusion([-1, 0]);
    platforms.forEachTile((t) => { if (t.index > 0) t.setCollision(false, false, true, false); });
    this.ladders = this.map.createLayer('ladders', tiles, 0, 0)!;

    const spawn = findSpawn(this.map, this.spawnId);
    this.player = new Player(this, spawn.x, spawn.y, gs.player.member);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, platforms, undefined, () =>
      this.time.now > this.player.dropThroughUntil && this.player.body.velocity.y >= 0 && !this.player.moveState.climbing);

    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBackgroundColor('#1f2335');

    this.portals = objectsOf(this.map, 'portals').map((o) => new Portal(this, o, gs.flags));
    this.savepoints = objectsOf(this.map, 'savepoints').map((o) => new ScentSavePoint(this, o));
    for (const p of this.portals) this.portalLabels.set(p, this.add.text(p.x, p.y - 70, '', SMALL_TEXT).setOrigin(0.5).setDepth(6));
    this.refreshPortals();
    for (const s of this.savepoints) this.add.text(s.x, s.y - 46, '향기', SMALL_TEXT).setOrigin(0.5).setDepth(6);
    this.npcs = objectsOf(this.map, 'spawns_npc')
      .map((o) => ({ o, def: getNpc(o.name) }))
      .filter(({ def }) => def.member !== gs.player.member)
      .map(({ o, def }) => new Npc(this, o.x, o.y, def, o.props.dialogue));
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.combat = new CombatController(this, this.player, gs, [ground, platforms]);
    for (const o of objectsOf(this.map, 'spawns_enemy')) this.combat.spawnEnemy(o.name, o.x, o.y);
    for (const o of objectsOf(this.map, 'bosses')) {
      if (!gs.flags.has(`boss_${o.name}_defeated`)) this.combat.spawnBoss(o.name, o.x, o.y);
    }
    this.combat.onPlayerDied = () => this.onPlayerDied();
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);

    this.cursors = this.input.keyboard!.createCursorKeys();

    const def = getMap(this.mapId);
    gs.location = { mapId: this.mapId, spawnId: this.spawnId };
    gs.chapter = Math.max(gs.chapter, def.chapter);
    gs.report({ type: 'map_entered', mapId: this.mapId });

    if (this.scene.isActive(SCENE.hud)) this.scene.stop(SCENE.hud);
    this.scene.launch(SCENE.hud);
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyF = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    this.refreshMarkers();
    this.unsubChanged = gs.bus.on('changed', () => { this.refreshMarkers(); this.refreshPortals(); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubChanged?.());

    if (def.chapter >= 1 && !gs.flags.has(`seen_ch${def.chapter}_intro`)) {
      gs.flags.add(`seen_ch${def.chapter}_intro`);
      this.events.once(Phaser.Scenes.Events.CREATE, () => this.playCutscene(`ch${def.chapter}_intro`));
    }
  }

  private moveConfig(): MoveConfig {
    return { ...DEFAULT_MOVE_CONFIG, maxJumps: this.session.gs.player.level >= 10 ? 2 : 1 };
  }

  private overlapsPlayer(obj: Phaser.GameObjects.Components.GetBounds): boolean {
    return Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), obj.getBounds());
  }

  /** ↑ 키 상호작용. 우선순위: NPC → 포탈 → 향기 */
  private interact(): void {
    const npc = this.npcs.find((n) => this.overlapsPlayer(n));
    if (npc) { this.talkTo(npc); return; }
    const portal = this.portals.find((p) => this.overlapsPlayer(p));
    if (portal) {
      if (portal.locked) floatText(this, this.player.x, this.player.y - 60, '아직 열리지 않은 문이다', '#a9b1d6');
      else this.transitionTo(portal.target, portal.spawn);
      return;
    }
    const scent = this.savepoints.find((s) => this.overlapsPlayer(s));
    if (scent) this.saveAt(scent.saveName);
  }

  openDialogue(scriptId: string, onDone?: (flags: Set<string>) => void): void {
    this.scene.pause();
    this.scene.launch(SCENE.dialogue, { scriptId, onDone } satisfies DialogueData);
  }

  activeBoss(): Boss | null {
    return this.combat?.boss ?? null;
  }

  private talkTo(npc: Npc): void {
    const gs = this.session.gs;
    const action = pickNpcAction(gs.quests, npc.def.id, npc.dialogueOverride ?? npc.def.dialogue);
    this.openDialogue(action.scriptId, () => {
      gs.report({ type: 'npc_talked', npcId: npc.def.id, dialogueId: action.scriptId });
      if (action.kind === 'offer') gs.startQuest(action.questId);
      if (action.kind === 'complete') this.afterQuestComplete(action.questId, gs.completeQuest(action.questId));
      this.refreshMarkers();
    });
  }

  private afterQuestComplete(_questId: string, reward: Reward): void {
    this.refreshPortals();
    for (const f of reward.flags ?? []) {
      const m = /^ch(\d+)_clear$/.exec(f);
      if (!m) continue;
      const gs = this.session.gs;
      gs.savedAt = Date.now();
      saveGame(this.session.store, this.session.slot, gs.snapshot());
      this.playCutscene(`ch${m[1]}_clear`);
    }
  }

  private playCutscene(cutsceneId: string): void {
    this.scene.pause();
    this.scene.launch(SCENE.cutscene, { cutsceneId, next: { resume: SCENE.world } } satisfies CutsceneData);
  }

  private refreshMarkers(): void {
    for (const n of this.npcs) {
      const m = markerFor(this.session.gs.quests, n.def.id);
      n.setMarker(m?.text ?? '', m?.color ?? '#ffffff');
    }
  }

  private refreshPortals(): void {
    const flags = this.session.gs.flags;
    for (const p of this.portals) {
      if (p.locked && p.requiresFlag && flags.has(p.requiresFlag)) p.unlock();
      this.portalLabels.get(p)?.setText(p.locked ? '잠김' : getMap(p.target).name);
    }
  }

  private transitionTo(mapId: string, spawnId: string): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({ mapId, spawnId } satisfies WorldData));
  }

  private saveAt(saveName: string): void {
    const gs = this.session.gs;
    const max = gs.maxStats();
    gs.heal(max.hp, max.mp);
    gs.location = { mapId: this.mapId, spawnId: saveName };
    gs.savedAt = Date.now();
    saveGame(this.session.store, this.session.slot, gs.snapshot());
    floatText(this, this.player.x, this.player.y - 60, '향기를 남겼다 (저장됨)', '#ff9e64');
  }

  private onPlayerDied(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.setVelocity(0, 0).setTint(0x565f89);
    floatText(this, this.player.x, this.player.y - 60, '무대 실수...', '#f7768e', 18);
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const gs = this.session.gs;
      const max = gs.maxStats();
      gs.heal(Math.floor(max.hp / 2), Math.floor(max.mp / 2));
      this.scene.restart({ mapId: gs.location.mapId, spawnId: gs.location.spawnId } satisfies WorldData);
    });
  }

  update(_time: number, delta: number): void {
    this.session.gs.playTimeMs += delta;
    if (this.transitioning) return;
    const probe = this.ladders.getTileAtWorldXY(this.player.x, this.player.y - 20);
    const onLadder = !!probe && probe.index > 0;
    const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
    if (!onLadder && upJustPressed) this.interact();
    if (Phaser.Input.Keyboard.JustDown(this.keyA)) this.combat.castSkill(getSkill(`${this.session.gs.player.member}_basic`));
    const member = getMember(this.session.gs.player.member);
    if (Phaser.Input.Keyboard.JustDown(this.keyS)) this.castSlot(member.skills[1]!);
    if (Phaser.Input.Keyboard.JustDown(this.keyD)) this.castSlot(member.skills[2]!);
    if (Phaser.Input.Keyboard.JustDown(this.keyF)) this.useFirstConsumable();
    this.mpRegenAcc += delta;
    if (this.mpRegenAcc >= 1000) {
      this.mpRegenAcc -= 1000;
      if (this.session.gs.player.mp < this.session.gs.maxStats().mp) this.session.gs.heal(0, 1);
    }
    this.combat.update(this.time.now);
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

  private castSlot(skillId: string): void {
    const skill = getSkill(skillId);
    if (this.session.gs.player.level < skill.level) {
      floatText(this, this.player.x, this.player.y - 60, `${skill.name}: Lv.${skill.level}에 해금`, '#a9b1d6');
      return;
    }
    this.combat.castSkill(skill);
  }

  private useFirstConsumable(): void {
    const gs = this.session.gs;
    const food = Object.keys(gs.inventory.items).filter(hasItem).map((id) => getItem(id)).find((it) => it.type === 'consumable');
    if (!food || food.type !== 'consumable') {
      floatText(this, this.player.x, this.player.y - 60, '먹을 게 없다', '#a9b1d6');
      return;
    }
    const bonus = 1 + (passiveTotals(gs.memes, getMeme).foodHeal ?? 0);
    gs.inventory = removeItem(gs.inventory, food.id);
    gs.heal(Math.floor((food.heal.hp ?? 0) * bonus), Math.floor((food.heal.mp ?? 0) * bonus));
    floatText(this, this.player.x, this.player.y - 60, `${food.name} 냠`, '#9ece6a');
  }
}
