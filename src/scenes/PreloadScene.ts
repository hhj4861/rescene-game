import Phaser from 'phaser';
import { ENEMIES, MAPS, MEMBERS, NPCS } from '../data/index';
import { SCENE, enemyTex, mapKey, npcTex, playerTex } from '../core/AssetKeys';
import { heartTex, lifeTex, TEX2, tilesetTex } from '../core/ArcadeAssetKeys';
import { ENEMY_ANIMS, NPC_ANIMS, NPC_FRAME, PLAYER_ANIMS, PLAYER_FRAME, enemyAnimKey, enemySheetUrl, npcAnimKey, npcSheetUrl, playerAnimKey, playerSheetUrl, type EnemyAnim, type NpcAnim, type PlayerAnim } from '../core/spriteFrames';
import { makePlaceholderTextures } from '../ui/placeholders';
import { UI_TEXT } from '../ui/textStyles';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

// Task 16이 만든 새 시트들의 프레임 규격(tools/build-sprites-lib.ts와 짝을 맞춘다).
const HEART_FRAME = { width: 16, height: 16 } as const;
const CARD_FRAME = { width: 16, height: 20 } as const;
const CHEST_FRAME = { width: 24, height: 20 } as const;
const GO_FRAME = { width: 32, height: 16 } as const;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE.preload);
  }
  preload(): void {
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '불러오는 중...', UI_TEXT).setOrigin(0.5);
    this.load.on('progress', (v: number) => label.setText(`불러오는 중... ${Math.round(v * 100)}%`));
    for (const m of MAPS) this.load.tilemapTiledJSON(mapKey(m.id), `assets/maps/${m.file}`);
    for (const m of MEMBERS) this.load.spritesheet(playerTex(m.id), playerSheetUrl(m.id), { frameWidth: PLAYER_FRAME.width, frameHeight: PLAYER_FRAME.height });
    for (const e of ENEMIES) this.load.spritesheet(enemyTex(e.id), enemySheetUrl(e.id), { frameWidth: e.width, frameHeight: e.height });
    for (const n of NPCS) this.load.spritesheet(npcTex(n.id), npcSheetUrl(n.id), { frameWidth: NPC_FRAME.width, frameHeight: NPC_FRAME.height });
    // 기존 TEX.tiles 플레이스홀더는 create()에서 makePlaceholderTextures가 그대로 유지한다(구 맵이 아직 쓴다).
    this.load.image(tilesetTex('stage1'), 'assets/tiles/stage1.png');
    for (const m of MEMBERS) {
      this.load.spritesheet(heartTex(m.id), `assets/sprites/${heartTex(m.id)}.png`, { frameWidth: HEART_FRAME.width, frameHeight: HEART_FRAME.height });
      this.load.image(lifeTex(m.id), `assets/sprites/${lifeTex(m.id)}.png`);
    }
    this.load.spritesheet(TEX2.card, `assets/sprites/${TEX2.card}.png`, { frameWidth: CARD_FRAME.width, frameHeight: CARD_FRAME.height });
    this.load.spritesheet(TEX2.chest, `assets/sprites/${TEX2.chest}.png`, { frameWidth: CHEST_FRAME.width, frameHeight: CHEST_FRAME.height });
    this.load.image(TEX2.hudHeartFull, `assets/sprites/${TEX2.hudHeartFull}.png`);
    this.load.image(TEX2.hudHeartEmpty, `assets/sprites/${TEX2.hudHeartEmpty}.png`);
    this.load.spritesheet(TEX2.go, `assets/sprites/${TEX2.go}.png`, { frameWidth: GO_FRAME.width, frameHeight: GO_FRAME.height });
  }
  create(): void {
    makePlaceholderTextures(this);
    this.createAnims();
    this.createArcadeAnims();
    this.scene.start(SCENE.title);
  }

  /** 하트·카드·GO 시트에 2프레임 4fps 반복 애니메이션을 등록한다(`<key>_anim`). */
  private createArcadeAnims(): void {
    const loop = (tex: string): void => {
      const key = `${tex}_anim`;
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
    };
    for (const m of MEMBERS) loop(heartTex(m.id));
    loop(TEX2.card);
    loop(TEX2.go);
  }

  /** 시트별 공용 애니메이션을 등록한다(도트 필터는 main.ts의 pixelArt가 담당). */
  private createAnims(): void {
    const define = (key: string, tex: string, def: { frames: readonly number[]; frameRate: number; repeat: number }): void => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { frames: [...def.frames] }), frameRate: def.frameRate, repeat: def.repeat });
    };
    for (const m of MEMBERS) for (const [anim, def] of Object.entries(PLAYER_ANIMS) as [PlayerAnim, (typeof PLAYER_ANIMS)[PlayerAnim]][]) define(playerAnimKey(m.id, anim), playerTex(m.id), def);
    for (const e of ENEMIES) for (const [anim, def] of Object.entries(ENEMY_ANIMS) as [EnemyAnim, (typeof ENEMY_ANIMS)[EnemyAnim]][]) define(enemyAnimKey(e.id, anim), enemyTex(e.id), def);
    for (const n of NPCS) for (const [anim, def] of Object.entries(NPC_ANIMS) as [NpcAnim, (typeof NPC_ANIMS)[NpcAnim]][]) define(npcAnimKey(n.id, anim), npcTex(n.id), def);
  }
}
