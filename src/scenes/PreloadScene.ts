import Phaser from 'phaser';
import { MAPS, MEMBERS } from '../data/index';
import { SCENE, mapKey, playerTex } from '../core/AssetKeys';
import { PLAYER_ANIMS, PLAYER_FRAME, playerAnimKey, playerSheetUrl, type PlayerAnim } from '../core/spriteFrames';
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
  }
  create(): void {
    makePlaceholderTextures(this);
    this.createPlayerAnims();
    this.scene.start(SCENE.title);
  }

  /** 멤버 스프라이트시트의 공용 애니메이션을 등록한다(도트 필터는 main.ts의 pixelArt가 담당). */
  private createPlayerAnims(): void {
    for (const m of MEMBERS) {
      for (const [anim, def] of Object.entries(PLAYER_ANIMS) as [PlayerAnim, (typeof PLAYER_ANIMS)[PlayerAnim]][]) {
        const key = playerAnimKey(m.id, anim);
        if (this.anims.exists(key)) continue;
        this.anims.create({ key, frames: this.anims.generateFrameNumbers(playerTex(m.id), { frames: [...def.frames] }), frameRate: def.frameRate, repeat: def.repeat });
      }
    }
  }
}
