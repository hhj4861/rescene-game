import Phaser from 'phaser';
import { SCENE, TEX, mapKey } from '../core/AssetKeys';
import { getSession, type Session } from '../core/session';
import { getMap } from '../data/index';
import { Player } from '../entities/Player';
import { Portal } from '../entities/Portal';
import { ScentSavePoint } from '../entities/ScentSavePoint';
import { DEFAULT_MOVE_CONFIG, type MoveConfig } from '../systems/movement';
import { saveGame } from '../systems/save';
import { floatText } from '../ui/FloatText';
import { SMALL_TEXT } from '../ui/textStyles';
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
  private savepoints: ScentSavePoint[] = [];
  private transitioning = false;

  constructor() {
    super(SCENE.world);
  }

  init(data: WorldData): void {
    this.mapId = data.mapId;
    this.spawnId = data.spawnId ?? 'start';
  }

  create(): void {
    this.transitioning = false;
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
    for (const p of this.portals) this.add.text(p.x, p.y - 70, p.locked ? '잠김' : getMap(p.target).name, SMALL_TEXT).setOrigin(0.5).setDepth(6);
    for (const s of this.savepoints) this.add.text(s.x, s.y - 46, '향기', SMALL_TEXT).setOrigin(0.5).setDepth(6);
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.cursors = this.input.keyboard!.createCursorKeys();

    const def = getMap(this.mapId);
    gs.location = { mapId: this.mapId, spawnId: this.spawnId };
    gs.chapter = Math.max(gs.chapter, def.chapter);
    gs.report({ type: 'map_entered', mapId: this.mapId });
    this.add.text(8, 8, def.name, SMALL_TEXT).setScrollFactor(0).setDepth(100);
  }

  private moveConfig(): MoveConfig {
    return { ...DEFAULT_MOVE_CONFIG, maxJumps: this.session.gs.player.level >= 10 ? 2 : 1 };
  }

  private overlapsPlayer(obj: Phaser.GameObjects.Components.GetBounds): boolean {
    return Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), obj.getBounds());
  }

  /** ↑ 키 상호작용. 우선순위: 포탈 → 향기 (Task 20에서 NPC가 앞에 추가된다) */
  private interact(): void {
    const portal = this.portals.find((p) => this.overlapsPlayer(p));
    if (portal) {
      if (portal.locked) floatText(this, this.player.x, this.player.y - 60, '아직 열리지 않은 문이다', '#a9b1d6');
      else this.transitionTo(portal.target, portal.spawn);
      return;
    }
    const scent = this.savepoints.find((s) => this.overlapsPlayer(s));
    if (scent) this.saveAt(scent.saveName);
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

  update(_time: number, delta: number): void {
    this.session.gs.playTimeMs += delta;
    if (this.transitioning) return;
    const probe = this.ladders.getTileAtWorldXY(this.player.x, this.player.y - 20);
    const onLadder = !!probe && probe.index > 0;
    const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
    if (!onLadder && upJustPressed) this.interact();
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
}
