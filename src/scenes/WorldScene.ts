import Phaser from 'phaser';
import { SCENE, TEX, mapKey } from '../core/AssetKeys';
import { getSession, type Session } from '../core/session';
import { getMap } from '../data/index';
import { Player } from '../entities/Player';
import { DEFAULT_MOVE_CONFIG, type MoveConfig } from '../systems/movement';
import { SMALL_TEXT } from '../ui/textStyles';
import { findSpawn } from './worldObjects';

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

  constructor() {
    super(SCENE.world);
  }

  init(data: WorldData): void {
    this.mapId = data.mapId;
    this.spawnId = data.spawnId ?? 'start';
  }

  create(): void {
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

  update(_time: number, delta: number): void {
    this.session.gs.playTimeMs += delta;
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
}
