import Phaser from 'phaser';
import { ENEMIES, MAPS, MEMBERS, NPCS } from '../data/index';
import { SCENE, enemyTex, mapKey, npcTex, playerTex } from '../core/AssetKeys';
import { ENEMY_ANIMS, NPC_ANIMS, NPC_FRAME, PLAYER_ANIMS, PLAYER_FRAME, enemyAnimKey, enemySheetUrl, npcAnimKey, npcSheetUrl, playerAnimKey, playerSheetUrl, type EnemyAnim, type NpcAnim, type PlayerAnim } from '../core/spriteFrames';
import { makePlaceholderTextures } from '../ui/placeholders';
import { UI_TEXT } from '../ui/textStyles';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

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
  }
  create(): void {
    makePlaceholderTextures(this);
    this.createAnims();
    this.scene.start(SCENE.title);
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
