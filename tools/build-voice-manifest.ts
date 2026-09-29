import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MEMES } from '../src/data/memes';

const VOICE_FILE = /\.(ogg|mp3)$/;

/** `dir`(기본 `public/assets/voice`)를 훑어 `.ogg|.mp3` 파일명을 정렬 목록으로 돌려준다.
 * stem(확장자 제외 파일명)이 유행어 id가 아니면 경고만 출력하고 목록에서 빼지 않는다. */
export function buildVoiceManifest(dir = 'public/assets/voice'): { files: string[] } {
  if (!existsSync(dir)) return { files: [] };
  const files = readdirSync(dir)
    .filter((f) => VOICE_FILE.test(f))
    .sort();
  const memeIds = new Set(MEMES.map((m) => m.id));
  for (const f of files) {
    const stem = f.replace(VOICE_FILE, '');
    if (!memeIds.has(stem)) console.warn(`voice manifest: ${f}의 파일명이 유행어 id가 아닙니다 (${stem})`);
  }
  return { files };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = 'public/assets/voice';
  mkdirSync(dir, { recursive: true });
  const manifest = buildVoiceManifest(dir);
  const out = join(dir, 'manifest.json');
  writeFileSync(out, JSON.stringify(manifest));
  console.log(`${out} (${manifest.files.length} files)`);
}
