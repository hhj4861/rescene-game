import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';
import type { MapObject } from '../scenes/worldObjects';

export class Portal extends Phaser.Physics.Arcade.Image {
  readonly target: string;
  readonly spawn: string;
  readonly requiresFlag: string | undefined;
  readonly locked: boolean;

  constructor(scene: Phaser.Scene, obj: MapObject, flags: Set<string>) {
    const requiresFlag = obj.props.requiresFlag;
    const locked = !!requiresFlag && !flags.has(requiresFlag);
    super(scene, obj.x + obj.width / 2, obj.y + obj.height, locked ? TEX.portalLocked : TEX.portal);
    this.target = obj.props.target!;
    this.spawn = obj.props.spawn!;
    this.requiresFlag = requiresFlag;
    this.locked = locked;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1).setAlpha(0.85).setDepth(5);
  }
}
