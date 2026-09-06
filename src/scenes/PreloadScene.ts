import Phaser from 'phaser';
import { ENEMIES, MAPS, MEMBERS, NPCS } from '../data/index';
import { SCENE, enemyTex, mapKey, npcTex, playerTex } from '../core/AssetKeys';
import { heartTex, lifeTex, TEX2, tilesetTex } from '../core/ArcadeAssetKeys';
import { ENEMY_ANIMS, NPC_ANIMS, NPC_FRAME, PLAYER_ANIMS, PLAYER_FRAME, enemyAnimKey, enemySheetUrl, npcAnimKey, npcSheetUrl, playerAnimKey, playerSheetUrl, type EnemyAnim, type NpcAnim, type PlayerAnim } from '../core/spriteFrames';
import { voiceFileKey } from '../audio/VoiceFiles';
import { makePlaceholderTextures } from '../ui/placeholders';
import { UI_TEXT } from '../ui/textStyles';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

// Task 16이 만든 새 시트들의 프레임 규격(tools/build-sprites-lib.ts와 짝을 맞춘다).
const HEART_FRAME = { width: 16, height: 16 } as const;
const CARD_FRAME = { width: 16, height: 20 } as const;
const CHEST_FRAME = { width: 24, height: 20 } as const;
const GO_FRAME = { width: 32, height: 16 } as const;
// P2 sprites-2 Task 6: 점프대 오브젝트 시트 규격(tools/sprites/objects.ts와 짝을 맞춘다).
const JUMPPAD_FRAME = { width: 32, height: 16 } as const;
const TILE_PALETTES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5'] as const;

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
    for (const p of TILE_PALETTES) this.load.image(tilesetTex(p), `assets/tiles/${p}.png`);
    this.load.spritesheet(TEX2.jumppad, `assets/sprites/${TEX2.jumppad}.png`, { frameWidth: JUMPPAD_FRAME.width, frameHeight: JUMPPAD_FRAME.height });
    for (const m of MEMBERS) {
      this.load.spritesheet(heartTex(m.id), `assets/sprites/${heartTex(m.id)}.png`, { frameWidth: HEART_FRAME.width, frameHeight: HEART_FRAME.height });
      this.load.image(lifeTex(m.id), `assets/sprites/${lifeTex(m.id)}.png`);
    }
    this.load.spritesheet(TEX2.card, `assets/sprites/${TEX2.card}.png`, { frameWidth: CARD_FRAME.width, frameHeight: CARD_FRAME.height });
    this.load.spritesheet(TEX2.chest, `assets/sprites/${TEX2.chest}.png`, { frameWidth: CHEST_FRAME.width, frameHeight: CHEST_FRAME.height });
    this.load.image(TEX2.hudHeartFull, `assets/sprites/${TEX2.hudHeartFull}.png`);
    this.load.image(TEX2.hudHeartEmpty, `assets/sprites/${TEX2.hudHeartEmpty}.png`);
    this.load.spritesheet(TEX2.go, `assets/sprites/${TEX2.go}.png`, { frameWidth: GO_FRAME.width, frameHeight: GO_FRAME.height });
    // Task 29: 권리를 확보한 유행어 음성 파일이 있으면 manifest를 통해서만 로드한다(§9.3).
    this.load.json('voice_manifest', 'assets/voice/manifest.json');
    this.load.once('filecomplete-json-voice_manifest', (_key: string, _type: string, data: { files: string[] }) => {
      for (const f of data.files) this.load.audio(voiceFileKey(f.replace(/\.(ogg|mp3)$/, '')), `assets/voice/${f}`);
    });
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
    loop(TEX2.jumppad);
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
