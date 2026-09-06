import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { getRun, hasRun } from '../core/runSession';
import { loadArcadeSave } from '../core/arcadeSave';
import { qualifies } from '../systems/highscore';
import { sfx } from '../audio/audioSession';
import { style } from '../ui/textStyles';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { NameEntryData } from './NameEntryScene';

export interface GameOverData {
  stageReached: number;
}

export class GameOverScene extends Phaser.Scene {
  private args!: GameOverData;

  constructor() {
    super(SCENE.gameOver);
  }

  init(data: GameOverData): void {
    this.args = data;
  }

  create(): void {
    sfx(this, 'gameover');
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '무대 실수... GAME OVER', style(24, '#ff5566', { fontStyle: 'bold' })).setOrigin(0.5);
    this.time.delayedCall(2000, () => this.proceed());
  }

  private proceed(): void {
    const run = hasRun(this) ? getRun(this) : null;
    const score = run?.state.score ?? 0;
    const member = run?.state.member ?? 'woni';
    const save = loadArcadeSave();
    if (qualifies(save, score)) {
      this.scene.start(SCENE.nameEntry, { score, member, stageReached: this.args.stageReached } satisfies NameEntryData);
    } else {
      this.scene.start(SCENE.title);
    }
  }
}
