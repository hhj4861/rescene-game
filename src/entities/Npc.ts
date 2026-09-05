import Phaser from 'phaser';
import { npcTex } from '../core/AssetKeys';
import type { NpcDef } from '../data/schema';
import { style } from '../ui/textStyles';

export class Npc extends Phaser.Physics.Arcade.Image {
  readonly def: NpcDef;
  readonly dialogueOverride: string | undefined;
  readonly marker: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, def: NpcDef, dialogueOverride?: string) {
    super(scene, x, y, npcTex(def.id));
    this.def = def;
    this.dialogueOverride = dialogueOverride;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1).setDepth(6);
    this.label = scene.add.text(x, y - 54, def.name, style(11, '#ffffff', { stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5).setDepth(6);
    this.marker = scene.add.text(x, y - 74, '', style(18, '#ffd166', { fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5).setDepth(6);
  }

  setMarker(text: string, color: string): void {
    this.marker.setText(text).setColor(color);
  }

  destroy(fromScene?: boolean): void {
    this.label.destroy();
    this.marker.destroy();
    super.destroy(fromScene);
  }
}
