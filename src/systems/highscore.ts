import type { MemberId } from './types';

export interface HighscoreEntry {
  initials: string;
  score: number;
  member: MemberId;
  stageReached: number;
  date: string;
}

export interface ArcadeSave {
  version: 2;
  highscores: HighscoreEntry[];
  unlockedStages: number;
  codex: string[];
  settings: { muted: boolean };
}

export const SAVE_KEY = 'rescene.arcade';
export const MAX_ENTRIES = 10;

export function emptySave(): ArcadeSave {
  return { version: 2, highscores: [], unlockedStages: 1, codex: [], settings: { muted: false } };
}

export function qualifies(save: ArcadeSave, score: number): boolean {
  if (save.highscores.length < MAX_ENTRIES) return true;
  const lowest = save.highscores[save.highscores.length - 1];
  return lowest ? score > lowest.score : true;
}

export function insertScore(save: ArcadeSave, entry: HighscoreEntry): { save: ArcadeSave; rank: number | null } {
  const combined = [...save.highscores, entry];
  combined.sort((a, b) => b.score - a.score);
  const truncated = combined.slice(0, MAX_ENTRIES);
  const idx = truncated.indexOf(entry);
  return { save: { ...save, highscores: truncated }, rank: idx === -1 ? null : idx + 1 };
}

export function unlockStage(save: ArcadeSave, index: number): ArcadeSave {
  return { ...save, unlockedStages: Math.max(save.unlockedStages, index) };
}

export function addCodex(save: ArcadeSave, ids: string[]): ArcadeSave {
  const set = new Set(save.codex);
  for (const id of ids) set.add(id);
  return { ...save, codex: [...set] };
}

export function setMuted(save: ArcadeSave, muted: boolean): ArcadeSave {
  return { ...save, settings: { ...save.settings, muted } };
}

export function serialize(save: ArcadeSave): string {
  return JSON.stringify(save);
}

export function parseSave(raw: string | null): ArcadeSave {
  if (raw === null) return emptySave();
  try {
    const parsed = JSON.parse(raw) as { version?: unknown };
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 2) return emptySave();
    return parsed as ArcadeSave;
  } catch {
    return emptySave();
  }
}

export function sanitizeInitials(s: string): string {
  const filtered = s.toUpperCase().replace(/[^A-Z0-9.]/g, '');
  return filtered.slice(0, 3).padEnd(3, '.');
}
