import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY_Y } from './config';
import { WorldScene } from './scenes/WorldScene';
import { HudScene } from './scenes/HudScene';
import { CutsceneScene } from './scenes/CutsceneScene';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { ResultScene } from './scenes/ResultScene';
import { ContinueScene } from './scenes/ContinueScene';
import { GameOverScene } from './scenes/GameOverScene';
import { NameEntryScene } from './scenes/NameEntryScene';
import { CodexScene } from './scenes/CodexScene';
import { EndingScene } from './scenes/EndingScene';

// TODO(T7): 옛 WorldScene이 `DialogueData` 타입을 계속 import하고 있어 DialogueScene.ts 파일 자체는
// 아직 지우지 못한다(소유권 밖 파일 수정 금지). 여기 씬 목록에서는 뺐다 — T4 개편이 끝나면 T7이 파일째 삭제한다.

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  backgroundColor: '#1a1a2e',
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: GRAVITY_Y }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [
    BootScene, PreloadScene, TitleScene, StageSelectScene, CharacterSelectScene, CutsceneScene,
    WorldScene, HudScene, ResultScene, ContinueScene, GameOverScene, NameEntryScene, CodexScene, EndingScene,
  ],
});
(window as unknown as { __game: Phaser.Game }).__game = game;
