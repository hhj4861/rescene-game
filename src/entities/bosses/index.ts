import type Phaser from 'phaser';
import type { EnemyDef } from '../../data/schema';
import { Boss } from '../Boss';

/** 보스 팩토리. `def.gimmick` 으로 기믹 서브클래스를 고른다(기믹 없음 → 기본 Boss). */
export function createBoss(scene: Phaser.Scene, x: number, y: number, def: EnemyDef): Boss {
  return new Boss(scene, x, y, def);
}
