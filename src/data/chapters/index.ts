import type { CutsceneDef, DialogueScript, NpcDef, QuestDef } from '../schema';
import { CH0_NPCS } from './ch0/npcs';
import { CH0_DIALOGUES } from './ch0/dialogues';
import { CH0_CUTSCENES } from './ch0/cutscenes';
import { CH1_NPCS } from './ch1/npcs';
import { CH1_DIALOGUES } from './ch1/dialogues';
import { CH1_QUESTS } from './ch1/quests';
import { CH1_CUTSCENES } from './ch1/cutscenes';

export const NPCS: NpcDef[] = [...CH0_NPCS, ...CH1_NPCS];
export const DIALOGUES: DialogueScript[] = [...CH0_DIALOGUES, ...CH1_DIALOGUES];
export const QUESTS: QuestDef[] = [...CH1_QUESTS];
export const CUTSCENES: CutsceneDef[] = [...CH0_CUTSCENES, ...CH1_CUTSCENES];
