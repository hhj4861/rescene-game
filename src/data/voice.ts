import type { VoiceProfile } from './schema';

/** NPC(공통) 음색 — 역할 NPC·심사위원 등. 스펙 §9.1. */
export const NPC_VOICE: VoiceProfile = { baseHz: 196, syllableMs: 90, wave: 'sawtooth' };
