import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { validateAllData } from '../data/index';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE.boot);
  }
  create(): void {
    validateAllData();
    this.input.keyboard?.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    this.scene.start(SCENE.preload);
  }
}
