import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { getRun } from '../core/runSession';
import { getStage, getStageByIndex } from '../data/index';
import { loadArcadeSave, persistArcadeSave } from '../core/arcadeSave';
import { addCodex, unlockStage } from '../systems/highscore';
import { sfx } from '../audio/audioSession';
import { SMALL_TEXT, TITLE_TEXT, UI_TEXT, style } from '../ui/textStyles';
import { GAME_WIDTH } from '../config';
import type { CutsceneData } from './CutsceneScene';

export interface ResultData {
  stageId: string;
  kills: number;
  maxCombo: number;
  noHitBoss: boolean;
  remainingSec: number;
}

const ROW_DELAY_MS = 500;

export class ResultScene extends Phaser.Scene {
  private args!: ResultData;
  private done = false;

  constructor() {
    super(SCENE.result);
  }

  init(data: ResultData): void {
    this.args = data;
    this.done = false;
  }

  create(): void {
    const stage = getStage(this.args.stageId);
    const run = getRun(this);

    let save = loadArcadeSave();
    save = unlockStage(save, stage.index + 1);
    save = addCodex(save, run.state.cards);
    persistArcadeSave(save);

    this.add.text(GAME_WIDTH / 2, 60, `${stage.name} 클리어!`, TITLE_TEXT).setOrigin(0.5);

    const rows = [
      `처치 ${this.args.kills}마리`,
      `최대 콤보 x${this.args.maxCombo}`,
      this.args.noHitBoss ? '보스 노히트! +2000' : '보스 피격 있음',
      `남은 시간 ${this.args.remainingSec}초`,
    ];
    rows.forEach((text, i) => {
      this.time.delayedCall(ROW_DELAY_MS * i, () => {
        sfx(this, 'clear');
        const t = this.add.text(GAME_WIDTH / 2, 150 + i * 32, text, UI_TEXT).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: t, alpha: 1, y: t.y - 6, duration: 250 });
      });
    });

    this.time.delayedCall(ROW_DELAY_MS * (rows.length + 1), () => {
      this.add
        .text(GAME_WIDTH / 2, 150 + rows.length * 32 + 30, `총점 ${String(run.state.score).padStart(7, '0')}`, style(24, '#ffd166', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      this.add.text(GAME_WIDTH / 2, 470, 'Enter 다음으로', SMALL_TEXT).setOrigin(0.5);
      this.done = true;
    });

    this.input.keyboard!.on('keydown-ENTER', () => this.proceed());
  }

  private proceed(): void {
    if (!this.done) return;
    const stage = getStage(this.args.stageId);
    const next = getStageByIndex(stage.index + 1);
    if (next) {
      this.scene.start(SCENE.cutscene, {
        lines: next.intro,
        voice: 'npc',
        next: { start: SCENE.world, data: { stageId: next.id } },
      } satisfies CutsceneData);
    } else {
      this.scene.start(SCENE.ending);
    }
  }
}
