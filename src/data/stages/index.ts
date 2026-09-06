import type { StageDef } from '../schema';
import { STAGE_1 } from './stage1';

export const STAGES: StageDef[] = [STAGE_1];

const byId = new Map(STAGES.map((s) => [s.id, s]));

export function getStage(id: string): StageDef {
  const s = byId.get(id);
  if (!s) throw new Error(`unknown stage: ${id}`);
  return s;
}

export function getStageByIndex(index: number): StageDef | undefined {
  return STAGES.find((s) => s.index === index);
}
