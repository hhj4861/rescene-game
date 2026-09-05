import type Phaser from 'phaser';
import type { GameState } from './GameState';
import type { SaveStore } from '../systems/save';

export interface Session {
  gs: GameState;
  slot: number;
  store: SaveStore;
}

const KEY = 'session';

export function setSession(scene: Phaser.Scene, s: Session): void {
  scene.registry.set(KEY, s);
}

export function hasSession(scene: Phaser.Scene): boolean {
  return scene.registry.has(KEY);
}

export function getSession(scene: Phaser.Scene): Session {
  const s = scene.registry.get(KEY) as Session | undefined;
  if (!s) throw new Error('no active session: start from Title');
  return s;
}
