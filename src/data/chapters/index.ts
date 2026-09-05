import type { CutsceneDef, DialogueScript, NpcDef, QuestDef } from '../schema';
import { CH0_NPCS } from './ch0/npcs';
import { CH0_DIALOGUES } from './ch0/dialogues';
import { CH0_CUTSCENES } from './ch0/cutscenes';

export const NPCS: NpcDef[] = [...CH0_NPCS];
export const DIALOGUES: DialogueScript[] = [...CH0_DIALOGUES];
export const QUESTS: QuestDef[] = [];
export const CUTSCENES: CutsceneDef[] = [...CH0_CUTSCENES];
