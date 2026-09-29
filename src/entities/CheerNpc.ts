import Phaser from 'phaser';
import { npcTex } from '../core/AssetKeys';
import { npcAnimKey } from '../core/spriteFrames';
import { getMember } from '../data/index';
import type { NpcDef } from '../data/schema';
import { style } from '../ui/textStyles';

const BUBBLE_MS = 2500;

/** 구간 사이 배경에 서서 한 마디 하는 멤버 NPC. 상호작용·충돌 없음. */
export class CheerNpc extends Phaser.GameObjects.Sprite {
  readonly def: NpcDef;
  private readonly label: Phaser.GameObjects.Text;
  private bubble: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, def: NpcDef) {
    super(scene, x, y, npcTex(def.id));
    this.def = def;
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(6);
    this.anims.play(npcAnimKey(def.id, 'idle'), true);
    this.label = scene.add.text(x, y - 54, def.name, style(11, '#ffffff', { stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5).setDepth(6);
  }

  /** 멤버 NPC 면 그 멤버 말버릇(lines.cheer)에서 무작위, 아니면 스테이지 데이터의 고정 문장. */
  pickLine(fallback: string): string {
    return this.def.member ? Phaser.Math.RND.pick(getMember(this.def.member).lines.cheer) : fallback;
  }

  /** 말풍선을 띄우고 살짝 뛴다. 소리는 씬(speakAs)이 낸다. */
  cheer(text: string, ms = BUBBLE_MS): void {
    this.bubble?.destroy();
    this.bubble = this.scene.add.text(this.x, this.y - 76, text, style(12, '#1a1b26', {
      backgroundColor: '#ffffff', padding: { x: 6, y: 3 }, align: 'center', wordWrap: { width: 220 },
    })).setOrigin(0.5, 1).setDepth(7);
    this.scene.tweens.add({ targets: this, y: this.y - 14, duration: 140, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
    const bubble = this.bubble;
    this.scene.time.delayedCall(ms, () => {
      if (this.bubble === bubble) this.bubble = null;
      bubble.destroy();
    });
  }

  destroy(fromScene?: boolean): void {
    this.label.destroy();
    this.bubble?.destroy();
    super.destroy(fromScene);
  }
}
