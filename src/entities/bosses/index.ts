import type Phaser from 'phaser';
import type { EnemyDef } from '../../data/schema';
import { Boss } from '../Boss';
import { CopycatBoss } from './CopycatBoss';
import { LensBoss } from './LensBoss';
import { SilenceBoss } from './SilenceBoss';
import { TrophyBoss } from './TrophyBoss';

/** 보스 팩토리. `def.gimmick`(공유 데이터 표 2: lens|silence|copycat|trophy)으로 서브클래스를 고른다. */
export function createBoss(scene: Phaser.Scene, x: number, y: number, def: EnemyDef): Boss {
  switch (def.gimmick) {
    case 'lens': return new LensBoss(scene, x, y, def);
    case 'silence': return new SilenceBoss(scene, x, y, def);
    case 'copycat': return new CopycatBoss(scene, x, y, def);
    case 'trophy': return new TrophyBoss(scene, x, y, def);
    default: return new Boss(scene, x, y, def);
  }
}
