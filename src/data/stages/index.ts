import type { StageDef } from '../schema';
import { STAGE_1 } from './stage1';
import { STAGE_2 } from './stage2';
import { STAGE_3 } from './stage3';
import { STAGE_4 } from './stage4';
import { STAGE_5 } from './stage5';

export const STAGES: StageDef[] = [STAGE_1, STAGE_2, STAGE_3, STAGE_4, STAGE_5];

const byId = new Map(STAGES.map((s) => [s.id, s]));

export function getStage(id: string): StageDef {
  const s = byId.get(id);
  if (!s) throw new Error(`unknown stage: ${id}`);
  return s;
}

export function getStageByIndex(index: number): StageDef | undefined {
  return STAGES.find((s) => s.index === index);
}
