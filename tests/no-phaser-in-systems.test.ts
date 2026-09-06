import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// src/audio는 파일마다 정책이 다르다: *Data.ts와 재생기(AudioBus 등)는 순수 TS,
// VoiceFiles.ts·audioSession.ts만 Phaser Scene을 받는 얇은 래퍼라 예외로 둔다.
const PURE_AUDIO_FILES = ['src/audio/sfxData.ts', 'src/audio/bgmData.ts'];

describe('systems and data stay engine-independent', () => {
  it('never import phaser', () => {
    const files = [...walk('src/systems'), ...walk('src/data'), ...PURE_AUDIO_FILES].filter((f) =>
      f.endsWith('.ts'),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/from ['"]phaser['"]/);
    }
  });
});
