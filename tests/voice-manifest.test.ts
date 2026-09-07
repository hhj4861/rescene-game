import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildVoiceManifest } from '../tools/build-voice-manifest';
import { MEMES } from '../src/data/memes';

const tempDirs: string[] = [];
function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'voice-manifest-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('buildVoiceManifest', () => {
  it('matches the committed manifest.json for the real voice folder', () => {
    const manifest = buildVoiceManifest();
    const onDisk = JSON.parse(readFileSync('public/assets/voice/manifest.json', 'utf8')) as { files: string[] };
    expect(manifest).toEqual(onDisk);
  });

  it('returns an empty file list for an empty folder', () => {
    const dir = makeTempDir();
    expect(buildVoiceManifest(dir)).toEqual({ files: [] });
  });

  it('returns an empty file list for a missing folder', () => {
    expect(buildVoiceManifest(join(tmpdir(), 'voice-manifest-does-not-exist'))).toEqual({ files: [] });
  });

  it('lists .ogg and .mp3 files sorted by name, ignoring other extensions', () => {
    const dir = makeTempDir();
    const memeId = MEMES[0]!.id;
    writeFileSync(join(dir, `${memeId}.ogg`), '');
    writeFileSync(join(dir, 'zena_ani.mp3'), '');
    writeFileSync(join(dir, 'README.md'), '');
    writeFileSync(join(dir, 'manifest.json'), '{}');
    expect(buildVoiceManifest(dir)).toEqual({ files: [`${memeId}.ogg`, 'zena_ani.mp3'].sort() });
  });

  it('warns but still includes files whose stem is not a meme id', () => {
    const dir = makeTempDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'not_a_meme_id.ogg'), '');
    const warn = console.warn;
    const calls: unknown[][] = [];
    console.warn = (...args: unknown[]) => calls.push(args);
    try {
      expect(buildVoiceManifest(dir)).toEqual({ files: ['not_a_meme_id.ogg'] });
    } finally {
      console.warn = warn;
    }
    expect(calls.length).toBe(1);
  });
});
