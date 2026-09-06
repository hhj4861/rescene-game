import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { ENDING_LINES } from '../data/ending';
import { NPC_VOICE } from '../data/voice';
import { STAGES } from '../data/index';
import { getRun, hasRun } from '../core/runSession';
import { loadArcadeSave } from '../core/arcadeSave';
import { qualifies } from '../systems/highscore';
import { getAudio, speakAs } from '../audio/audioSession';
import { style } from '../ui/textStyles';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { NameEntryData } from './NameEntryScene';

const LINE_MS = 2000;
const LINE_GAP = 60;

export class EndingScene extends Phaser.Scene {
  private texts: Phaser.GameObjects.Text[] = [];
  private finished = false;

  constructor() {
    super(SCENE.ending);
  }

  create(): void {
    this.finished = false;
    getAudio(this)?.bgm('title');

    const startY = GAME_HEIGHT + 40;
    this.texts = ENDING_LINES.map((line, i) =>
      this.add
        .text(GAME_WIDTH / 2, startY + i * LINE_GAP, line, style(16, '#ffffff', { align: 'center', wordWrap: { width: GAME_WIDTH - 200 } }))
        .setOrigin(0.5, 0),
    );

    const travel = ENDING_LINES.length * LINE_GAP + GAME_HEIGHT + 80;
    const duration = ENDING_LINES.length * LINE_MS;
    this.tweens.add({
      targets: this.texts,
      y: `-=${travel}`,
      duration,
      ease: 'Linear',
      onComplete: () => this.finish(),
    });

    ENDING_LINES.forEach((line, i) => {
      this.time.delayedCall(i * LINE_MS, () => speakAs(this, line.split(' — ')[0] ?? line, NPC_VOICE, 0.4));
    });

    this.input.keyboard!.on('keydown-ENTER', () => this.finish());
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    const run = hasRun(this) ? getRun(this) : null;
    const score = run?.state.score ?? 0;
    const member = run?.state.member ?? 'woni';
    const stageReached = run?.state.stageIndex ?? STAGES.length;
    const save = loadArcadeSave();
    if (qualifies(save, score)) {
      this.scene.start(SCENE.nameEntry, { score, member, stageReached } satisfies NameEntryData);
    } else {
      this.scene.start(SCENE.title);
    }
  }
}
