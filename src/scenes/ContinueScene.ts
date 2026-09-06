import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { getRun } from '../core/runSession';
import { sfx } from '../audio/audioSession';
import { SMALL_TEXT, TITLE_TEXT, style } from '../ui/textStyles';
import { GAME_WIDTH } from '../config';
import type { GameOverData } from './GameOverScene';

export interface ContinueData {
  stageId: string;
}

// T4가 개편할 WorldScene의 새 데이터 계약(플랜 상단 "씬 데이터 계약" 참고).
// WorldScene.ts는 T4 소유라 이 worktree에는 아직 옛 버전이 있어 그 파일의 타입을 import하지 않는다.
interface WorldStartData {
  stageId: string;
  sectionIndex?: number;
}

const COUNTDOWN_SEC = 10;

export class ContinueScene extends Phaser.Scene {
  private args!: ContinueData;
  private remaining = COUNTDOWN_SEC;
  private countText!: Phaser.GameObjects.Text;
  private timer: Phaser.Time.TimerEvent | null = null;
  private settled = false;

  constructor() {
    super(SCENE.continue);
  }

  init(data: ContinueData): void {
    this.args = data;
    this.remaining = COUNTDOWN_SEC;
    this.settled = false;
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 160, 'CONTINUE?', TITLE_TEXT).setOrigin(0.5);
    this.countText = this.add.text(GAME_WIDTH / 2, 260, String(this.remaining), style(64, '#ffd166', { fontStyle: 'bold' })).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 380, 'Enter 컨티뉴(점수 0)   Esc 포기', SMALL_TEXT).setOrigin(0.5);

    this.timer = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });

    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-ESC', () => this.giveUp());
  }

  private tick(): void {
    if (this.settled) return;
    this.remaining -= 1;
    sfx(this, 'menu');
    this.countText.setText(String(Math.max(0, this.remaining)));
    if (this.remaining <= 0) this.giveUp();
  }

  private confirm(): void {
    if (this.settled) return;
    if (getRun(this).useContinue()) {
      this.settled = true;
      this.timer?.remove();
      this.scene.start(SCENE.world, { stageId: this.args.stageId, sectionIndex: 0 } satisfies WorldStartData);
    } else {
      this.giveUp();
    }
  }

  private giveUp(): void {
    if (this.settled) return;
    this.settled = true;
    this.timer?.remove();
    const run = getRun(this);
    this.scene.start(SCENE.gameOver, { stageReached: run.state.stageIndex } satisfies GameOverData);
  }
}
