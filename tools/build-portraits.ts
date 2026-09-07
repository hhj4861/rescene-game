// `npm run portraits` → public/assets/portraits/portrait_<member>.png (192×64, 3프레임).
// `npm run portraits -- --preview /tmp/rescene-portraits/preview.png` 는 5인 × 3프레임을 3배로 키운 미리보기 PNG만 쓴다(저장소 밖 육안 확인용).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { MEMBERS } from '../src/data/members';
import { encodePng } from './pixel-art';
import { PORTRAITS_DIR, buildPortraitSheet, portraitSheetFile } from './sprites/portraits';

const PREVIEW_SCALE = 3;
// 외곽선(#12131c)·검은 머리가 묻히지 않도록 게임 배경보다 밝은 중간 톤을 깐다.
const PREVIEW_BG: [number, number, number] = [0x6c, 0x70, 0x86];

/** rgba 를 k배로 확대해 배경색 위에 얹는다. */
function scaleOnto(src: Uint8Array, w: number, h: number, k: number, dst: Uint8Array, dstW: number, dx: number, dy: number): void {
  for (let y = 0; y < h * k; y++) {
    for (let x = 0; x < w * k; x++) {
      const si = ((y / k | 0) * w + (x / k | 0)) * 4;
      const di = ((dy + y) * dstW + dx + x) * 4;
      if (src[si + 3] === 0) { dst[di] = PREVIEW_BG[0]; dst[di + 1] = PREVIEW_BG[1]; dst[di + 2] = PREVIEW_BG[2]; dst[di + 3] = 255; continue; }
      dst.set(src.subarray(si, si + 4), di);
    }
  }
}

const previewIdx = process.argv.indexOf('--preview');
if (previewIdx >= 0) {
  const out = process.argv[previewIdx + 1];
  if (!out) throw new Error('--preview <path> 가 필요하다');
  const sheets = MEMBERS.map((m) => buildPortraitSheet(m.id));
  const w = sheets[0]!.width * PREVIEW_SCALE;
  const h = sheets[0]!.height * PREVIEW_SCALE * sheets.length;
  const rgba = new Uint8Array(w * h * 4);
  sheets.forEach((s, i) => scaleOnto(s.rgba, s.width, s.height, PREVIEW_SCALE, rgba, w, 0, i * s.height * PREVIEW_SCALE));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, encodePng(w, h, rgba));
  console.log(`${out} (${w}x${h})`);
} else {
  mkdirSync(PORTRAITS_DIR, { recursive: true });
  for (const m of MEMBERS) {
    const sheet = buildPortraitSheet(m.id);
    const file = portraitSheetFile(m.id);
    writeFileSync(file, sheet.png);
    console.log(`${file} (${sheet.width}x${sheet.height}, ${sheet.png.length} bytes)`);
  }
}
