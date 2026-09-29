import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { buildEnemySheet, buildNpcSheet, buildPlayerSheet, ENEMY_FEATURES, ENEMY_MATERIALS, enemyShadeOptions, playerSheetFile, renderPose } from '../tools/build-sprites-lib';
import { ENEMY_SPRITES, type EnemySprite } from '../tools/sprites/enemies';
import { MEMBERS } from '../src/data/members';
import { ENEMY_FRAME_COUNT, OUTFITS, PLAYER_ANIMS, PLAYER_BODY, PLAYER_FRAME, PLAYER_FRAME_COUNT } from '../src/core/spriteFrames';
import { BASE_PALETTE, DETAIL_LINE, HAIR, HEAD_SHEEN, LOOKS } from '../tools/sprites/templates';
import { armLayer, legsGrid, POSES, SHOULDER } from '../tools/sprites/poses';
import { OUTFIT_PALETTES } from '../tools/sprites/outfits';
import { ramp } from '../tools/sprites/ramps';
import { variantChar } from '../tools/sprites/shading';

type Sheet = { width: number; height: number; rgba: Uint8Array };
const frameOf = (sheet: Sheet, i: number): string => {
  const out: number[] = [];
  for (let y = 0; y < sheet.height; y++) out.push(...sheet.rgba.slice((y * sheet.width + i * PLAYER_FRAME.width) * 4, (y * sheet.width + (i + 1) * PLAYER_FRAME.width) * 4));
  return out.join(',');
};
const hex = (s: string): [number, number, number] => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
/** 프레임 i 안에 색 color 픽셀이 몇 개 있는지. */
const countColor = (sheet: Sheet, i: number, color: string): number => {
  const [r, g, b] = hex(color);
  let n = 0;
  for (let y = 0; y < sheet.height; y++) for (let x = i * PLAYER_FRAME.width; x < (i + 1) * PLAYER_FRAME.width; x++) {
    const o = (y * sheet.width + x) * 4;
    if (sheet.rgba[o + 3]! > 0 && sheet.rgba[o] === r && sheet.rgba[o + 1] === g && sheet.rgba[o + 2] === b) n++;
  }
  return n;
};
/** 프레임 i의 (x, y) 픽셀 색(#rrggbb), 투명이면 null. */
const pixelAt = (sheet: Sheet, i: number, x: number, y: number): string | null => {
  const o = (y * sheet.width + i * PLAYER_FRAME.width + x) * 4;
  return sheet.rgba[o + 3]! > 0 ? '#' + [0, 1, 2].map((k) => sheet.rgba[o + k]!.toString(16).padStart(2, '0')).join('') : null;
};
/** 프레임 i의 실루엣 가장자리(4방향 이웃 중 투명·프레임 밖이 있는 불투명 픽셀) 수와 그중 외곽선 검정 수. */
const silhouette = (sheet: Sheet, i: number): { all: number; black: number } => {
  let all = 0, black = 0;
  for (let y = 0; y < PLAYER_FRAME.height; y++) for (let x = 0; x < PLAYER_FRAME.width; x++) {
    const c = pixelAt(sheet, i, x, y);
    if (!c) continue;
    const edge = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
      const nx = x + dx!, ny = y + dy!;
      return nx < 0 || ny < 0 || nx >= PLAYER_FRAME.width || ny >= PLAYER_FRAME.height || !pixelAt(sheet, i, nx, ny);
    });
    if (edge) { all++; if (c === BASE_PALETTE.K) black++; }
  }
  return { all, black };
};
/** 프레임 i의 불투명 픽셀 경계(프레임 좌표). */
const bounds = (sheet: Sheet, i: number): { left: number; right: number; top: number; bottom: number } => {
  let left: number = PLAYER_FRAME.width, right = -1, top: number = PLAYER_FRAME.height, bottom = -1;
  for (let y = 0; y < sheet.height; y++) for (let x = 0; x < PLAYER_FRAME.width; x++) {
    if (sheet.rgba[(y * sheet.width + i * PLAYER_FRAME.width + x) * 4 + 3]! === 0) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return { left, right, top, bottom };
};

describe('player sprite sheets (character v2, 40×64 × 15)', () => {
  it('has 15 frames and the animation indices cover 0..14 without gaps', () => {
    expect(PLAYER_FRAME_COUNT).toBe(15);
    expect(PLAYER_FRAME).toEqual({ width: 40, height: 64 });
    const all = [...new Set(Object.values(PLAYER_ANIMS).flatMap((a) => [...a.frames]))].sort((x, y) => x - y);
    expect(all).toEqual([...Array(PLAYER_FRAME_COUNT).keys()]);
    // 웨이브 1 호환: 옛 Player가 통째로 재생하는 attack = 체인 1·2·3타 프레임
    expect([...PLAYER_ANIMS.attack.frames]).toEqual([PLAYER_ANIMS.attack1.frames[0], PLAYER_ANIMS.attack2.frames[0], PLAYER_ANIMS.attack3.frames[0]]);
  });
  it('every member × outfit builds a 600×64 sheet', () => {
    for (const m of MEMBERS) for (const o of OUTFITS) {
      const sheet = buildPlayerSheet(m.id, o);
      expect(sheet.width, `${m.id}/${o}`).toBe(PLAYER_FRAME.width * PLAYER_FRAME_COUNT);
      expect(sheet.height, `${m.id}/${o}`).toBe(PLAYER_FRAME.height);
    }
  });
  it('pose frames differ (idle bob, flourish, walk, jump, attack chain, hurt, super, win)', () => {
    for (const m of MEMBERS) {
      const sheet = buildPlayerSheet(m.id);
      const f = PLAYER_ANIMS;
      const idle = frameOf(sheet, f.idle.frames[0]);
      expect(frameOf(sheet, f.idle.frames[1]), `${m.id} idle`).not.toBe(idle);
      expect(frameOf(sheet, f.flourish.frames[0]), `${m.id} flourish`).not.toBe(idle);
      expect(frameOf(sheet, f.walk.frames[0]), `${m.id} walk0`).not.toBe(frameOf(sheet, f.walk.frames[1]));
      expect(frameOf(sheet, f.walk.frames[0]), `${m.id} walk0/2`).not.toBe(frameOf(sheet, f.walk.frames[2]));
      expect(frameOf(sheet, f.jump.frames[0]), `${m.id} jump`).not.toBe(idle);
      const a1 = frameOf(sheet, f.attack1.frames[0]), a2 = frameOf(sheet, f.attack2.frames[0]), a3 = frameOf(sheet, f.attack3.frames[0]);
      expect(a1, `${m.id} attack1`).not.toBe(idle);
      expect(a1, `${m.id} attack1/2`).not.toBe(a2);
      expect(a2, `${m.id} attack2/3`).not.toBe(a3);
      expect(a1, `${m.id} attack1/3`).not.toBe(a3);
      expect(frameOf(sheet, f.hurt.frames[0]), `${m.id} hurt`).not.toBe(idle);
      expect(frameOf(sheet, f.super.frames[0]), `${m.id} super0`).not.toBe(frameOf(sheet, f.super.frames[1]));
      expect(frameOf(sheet, f.super.frames[0]), `${m.id} super`).not.toBe(idle);
      expect(frameOf(sheet, f.win.frames[0]), `${m.id} win`).not.toBe(idle);
    }
  });
  it('members are told apart: idle frames differ and each signature accessory colour is present', () => {
    const idles = MEMBERS.map((m) => frameOf(buildPlayerSheet(m.id), 0));
    expect(new Set(idles).size).toBe(MEMBERS.length);
    // 액세서리: 원이 금색 귀걸이 · 메이 헤어클립(2px) · 제나 리본(3×3 × 2) · 미나미 갸루 하이라이트(눈 밑 흰 픽셀 2개 더)
    expect(countColor(buildPlayerSheet('woni'), 0, LOOKS.woni!.accent)).toBeGreaterThanOrEqual(1);
    expect(countColor(buildPlayerSheet('may'), 0, LOOKS.may!.accent)).toBeGreaterThanOrEqual(2);
    expect(countColor(buildPlayerSheet('zena'), 0, LOOKS.zena!.accent)).toBeGreaterThanOrEqual(6);
    expect(countColor(buildPlayerSheet('minami'), 0, '#ffffff')).toBeGreaterThanOrEqual(countColor(buildPlayerSheet('woni'), 0, '#ffffff') + 2);
  });
  it('signature poses differ between members (flourish, super and win are per member)', () => {
    const supers = MEMBERS.map((m) => frameOf(buildPlayerSheet(m.id), PLAYER_ANIMS.super.frames[0]));
    const wins = MEMBERS.map((m) => frameOf(buildPlayerSheet(m.id), PLAYER_ANIMS.win.frames[0]));
    const flourishes = MEMBERS.map((m) => frameOf(buildPlayerSheet(m.id), PLAYER_ANIMS.flourish.frames[0]));
    expect(new Set(supers).size).toBe(MEMBERS.length);
    expect(new Set(wins).size).toBe(MEMBERS.length);
    expect(new Set(flourishes).size).toBe(MEMBERS.length);
  });
  it('outfits differ from each other for the same member', () => {
    const idles = OUTFITS.map((o) => frameOf(buildPlayerSheet('woni', o), 0));
    expect(new Set(idles).size).toBe(OUTFITS.length);
  });
  it('sprites stand on the bottom row, start inside the physics body top and stay inside the frame', () => {
    for (const m of MEMBERS) {
      const sheet = buildPlayerSheet(m.id);
      for (let i = 0; i < PLAYER_FRAME_COUNT; i++) {
        const b = bounds(sheet, i);
        expect(b.left, `${m.id} frame ${i} left`).toBeGreaterThanOrEqual(0);
        expect(b.right, `${m.id} frame ${i} right`).toBeLessThanOrEqual(PLAYER_FRAME.width - 1);
        expect(b.top, `${m.id} frame ${i} top`).toBeGreaterThanOrEqual(0);
      }
      const idle = bounds(sheet, PLAYER_ANIMS.idle.frames[0]);
      expect(idle.bottom, `${m.id} feet`).toBe(PLAYER_FRAME.height - 1);
      expect(idle.top, `${m.id} head`).toBeLessThanOrEqual(PLAYER_BODY.offsetY);
    }
  });
  it('generated png files (5 members × 5 outfits) match the sources (run npm run sprites)', () => {
    for (const m of MEMBERS) for (const o of OUTFITS) {
      const file = playerSheetFile(m.id, o);
      expect(file).toBe(o === 'training' ? `public/assets/sprites/player_${m.id}.png` : `public/assets/sprites/player_${m.id}_${o}.png`);
      expect(existsSync(file), file).toBe(true);
      expect(Buffer.compare(readFileSync(file), Buffer.from(buildPlayerSheet(m.id, o).png)), file).toBe(0);
    }
  });
});

describe('sprite shading (A안: 형태 음영 + 접촉 그림자 + 정수리 광택 + 선택적 외곽선)', () => {
  it('idle frame carries the hair light tone, the top shade/dark tones and the skin rim shade', () => {
    for (const m of MEMBERS) {
      const sheet = buildPlayerSheet(m.id);
      const look = LOOKS[m.id]!;
      expect(countColor(sheet, 0, ramp(look.hairColor[0]).light), `${m.id} hair light`).toBeGreaterThan(0);
      expect(countColor(sheet, 0, ramp(look.top).shade), `${m.id} top shade`).toBeGreaterThan(0);
      expect(countColor(sheet, 0, ramp(look.top).dark), `${m.id} top dark`).toBeGreaterThan(0);
      expect(countColor(sheet, 0, ramp(BASE_PALETTE.S!).shade), `${m.id} skin rim`).toBeGreaterThan(0);
    }
  });
  it('keeps the silhouette outline black in every frame of every outfit (selective outline only softens internal lines)', () => {
    for (const m of MEMBERS) for (const o of OUTFITS) {
      const sheet = buildPlayerSheet(m.id, o);
      for (let i = 0; i < PLAYER_FRAME_COUNT; i++) {
        const s = silhouette(sheet, i);
        expect(s.black, `${m.id}/${o} frame ${i} black edge`).toBeGreaterThan(100);
        // 소품 막대(M 1px)·리본·효과만 검정이 아니다. 실측 최솟값 0.80(zena/road 공격1) — 0.7은 여유를 둔 하한선.
        expect(s.black / s.all, `${m.id}/${o} frame ${i} black edge ratio`).toBeGreaterThan(0.7);
      }
    }
  });
  it('keeps black detail lines that sit next to the eyes: judge glasses and liv choker', () => {
    const judge = buildNpcSheet('npc_audition_judge');
    for (const x of [12, 13, 14, 15, 16, 17]) { expect(pixelAt(judge, 0, x, 11), `glasses top x${x}`).toBe(BASE_PALETTE.K); expect(pixelAt(judge, 0, x, 15), `glasses bottom x${x}`).toBe(BASE_PALETTE.K); }
    const liv = buildPlayerSheet('liv');
    for (const x of [16, 17, 18, 19, 20, 21, 22, 23]) expect(pixelAt(liv, 0, x, 24), `choker x${x}`).toBe(BASE_PALETTE.K);
    expect(BASE_PALETTE[DETAIL_LINE]).toBe(BASE_PALETTE.K);
  });
  it('short-sleeve (skin) arms are outlined with the detail line so they stay visible over light tops', () => {
    const spec = { path: [SHOULDER.front, [22, 34] as [number, number]] };
    const skin = armLayer(spec, true).grid.join(''), sleeve = armLayer(spec).grid.join('');
    expect(skin).toContain(DETAIL_LINE); expect(skin).not.toContain('K');
    expect(sleeve).toContain('K'); expect(sleeve).not.toContain(DETAIL_LINE);
    // 메이 개인기(손 모으기)는 팔이 가슴을 가로지른다: 몸통 안쪽(프레임 x14~25·y29~40)의 검정은 연습복에선 상의 어둠색으로 바뀌어 0, 반소매 프리티에선 남는다.
    // 후드 아랫선(y28)은 뺀다 — 후드 끈(포인트색 A)에 닿은 외곽선은 끈 구멍처럼 검정으로 남기는 게 맞다.
    const blackInTorso = (sheet: Sheet, i: number): number => { let n = 0; for (let y = 29; y <= 40; y++) for (let x = 14; x <= 25; x++) if (pixelAt(sheet, i, x, y) === BASE_PALETTE.K) n++; return n; };
    const flourish = PLAYER_ANIMS.flourish.frames[0];
    expect(blackInTorso(buildPlayerSheet('may', 'training'), flourish)).toBe(0);
    expect(blackInTorso(buildPlayerSheet('may', 'pretty'), flourish)).toBeGreaterThan(0);
  });
  it('hand highlights: bangs tips and back-hair ends are dark, bent arms crease, skirts pleat, shoes glint', () => {
    expect(HAIR.long.front[10]).toContain(variantChar('H', 'dark'));
    expect(HAIR.long.back[40]).toContain(variantChar('h', 'dark'));
    expect(HAIR.twin.back[37]).toContain(variantChar('h', 'dark'));
    expect(HAIR.wavy.back[43]).toContain(variantChar('h', 'dark'));
    const bent = armLayer({ path: [SHOULDER.front, [33, 22], [31, 13]] }).grid.join('');
    expect(bent).toContain(variantChar('L', 'shade'));
    expect(armLayer({ path: [SHOULDER.front, [33, 22]] }).grid.join('')).not.toContain(variantChar('L', 'shade'));
    expect(legsGrid('skirt', 'stand').join('')).toContain(variantChar('B', 'dark'));
    expect(legsGrid('pants', 'stand').join('')).toContain(variantChar('O', 'light'));
  });
  it('shoes keep the hand-painted tones (rule shading is off for O so the 4×3 block never speckles)', () => {
    // 왼쪽 신발 = 프레임 x15~18 · y60~62(아래 y63 은 외곽선). 발등 왼쪽 광택 · 오른쪽 1px 그늘 · 밑창 한 줄.
    for (const m of MEMBERS) for (const o of OUTFITS) {
      const sheet = buildPlayerSheet(m.id, o), r = ramp(OUTFIT_PALETTES[o].O);
      const at = (x: number, y: number): string | null => pixelAt(sheet, 0, x, y);
      expect(at(15, 60), `${m.id}/${o} toe light`).toBe(r.light);
      expect([at(16, 60), at(17, 60), at(15, 61), at(16, 61), at(17, 61)], `${m.id}/${o} shoe body`).toEqual(Array<string>(5).fill(r.base));
      expect([at(18, 60), at(18, 61)], `${m.id}/${o} shoe right rim`).toEqual([r.shade, r.shade]);
      expect([at(15, 62), at(16, 62), at(17, 62), at(18, 62)], `${m.id}/${o} sole`).toEqual([r.shade, r.shade, r.shade, r.dark]);
      // 두 신발 사이 틈은 검정으로 남는다(선택적 외곽선이 신발 색으로 녹이지 않는다)
      expect([at(19, 61), at(20, 61)], `${m.id}/${o} shoe gap`).toEqual([BASE_PALETTE.K, BASE_PALETTE.K]);
    }
  });
  it('the head sheen is a hand-placed band on the crown, in front and back views alike', () => {
    for (const m of MEMBERS) {
      const sheet = buildPlayerSheet(m.id), light = ramp(LOOKS[m.id]!.hairColor[0]).light;
      // HEAD_SHEEN 3행은 그리드 x11~17 = 프레임 x15~21. 띠 밖(오른쪽 x22)과 정수리(y1)는 밝음이 아니다 — 머리 전체가 밝아지지 않는다.
      expect(pixelAt(sheet, 0, 15, 3), `${m.id} sheen left`).toBe(light);
      expect(pixelAt(sheet, 0, 21, 3), `${m.id} sheen right`).toBe(light);
      expect(pixelAt(sheet, 0, 22, 3), `${m.id} beyond sheen`).not.toBe(light);
      expect(pixelAt(sheet, 0, 17, 1), `${m.id} crown above sheen`).toBe(LOOKS[m.id]!.hairColor[0]);
      expect(countColor(sheet, 0, light), `${m.id} sheen size`).toBeGreaterThanOrEqual(HEAD_SHEEN.reduce((n, [, , x0, x1]) => n + (x1 - x0 + 1), 0));
    }
    // 제나 필살기 2프레임은 뒷모습 — 뒤통수에도 같은 광택이 온다
    const zena = buildPlayerSheet('zena'), light = ramp(LOOKS.zena!.hairColor[0]).light;
    for (const x of [15, 21]) expect(pixelAt(zena, PLAYER_ANIMS.super.frames[1], x, 3), `zena back view sheen x${x}`).toBe(light);
  });
  it('held props drop a 1px contact shade onto the hand instead of sitting flat on it', () => {
    // 리브 핸드마이크·미나미 붓은 손 위에 얹힌다: 소품 아랫변 바로 밑 피부가 그늘 톤이 된다.
    const shades = (grid: string[]): number => grid.join('').split(variantChar('S', 'shade')).length - 1;
    for (const m of ['liv', 'minami'] as const) {
      const held = renderPose(LOOKS[m]!, 'training', POSES.attack1);
      const bare = renderPose(LOOKS[m]!, 'training', { ...POSES.attack1, prop: 'none' });
      expect(shades(held), `${m} prop contact`).toBeGreaterThan(shades(bare));
    }
  });
});

describe('enemy sprite shading (A안: 적 21종에 재질 램프 음영)', () => {
  /** 프레임 i의 (x, y) 픽셀 색(#rrggbb). 적은 프레임 폭이 종마다 다르다. */
  const enemyPixel = (sheet: Sheet, art: EnemySprite, i: number, x: number, y: number): string | null => {
    const o = (y * sheet.width + i * art.width + x) * 4;
    return sheet.rgba[o + 3]! > 0 ? '#' + [0, 1, 2].map((k) => sheet.rgba[o + k]!.toString(16).padStart(2, '0')).join('') : null;
  };
  /** 원본 그리드의 역할 문자와 칠해진 색을 짝지어 훑는다. */
  const eachPixel = (id: string, fn: (role: string, colour: string | null, x: number, y: number, i: number) => void): void => {
    const art = ENEMY_SPRITES[id]!;
    const sheet = buildEnemySheet(id);
    art.frames.forEach((grid, i) => {
      for (let y = 0; y < art.height; y++) for (let x = 0; x < art.width; x++) {
        const role = grid[y]![x]!;
        if (role !== '.') fn(role, enemyPixel(sheet, art, i, x, y), x, y, i);
      }
    });
  };
  const ids = Object.keys(ENEMY_SPRITES);

  it('covers every role character used by the 21 templates (a missing one would stay flat)', () => {
    expect(ids.length).toBe(21);
    const known = new Set([...ENEMY_MATERIALS, ...ENEMY_FEATURES]);
    for (const id of ids) {
      const art = ENEMY_SPRITES[id]!;
      const used = new Set<string>();
      for (const grid of art.frames) for (const row of grid) for (const ch of row) if (ch !== '.') used.add(ch);
      expect([...used].filter((ch) => !known.has(ch)), `${id} unclassified roles`).toEqual([]);
      expect([...used].filter((ch) => !art.palette[ch]), `${id} roles without a palette colour`).toEqual([]);
      expect(art.frames.length, id).toBe(ENEMY_FRAME_COUNT);
    }
  });

  it('every enemy body carries the ramp: a light rim on the left and a shade band on the right', () => {
    for (const id of ids) {
      const art = ENEMY_SPRITES[id]!;
      const materials = enemyShadeOptions(id, art).materials;
      const tones = { light: 0, base: 0, shade: 0, dark: 0, off: 0 };
      eachPixel(id, (role, colour) => {
        if (!materials.includes(role)) return;
        const r = ramp(art.palette[role]!);
        if (colour === r.light) tones.light++;
        else if (colour === r.base) tones.base++;
        else if (colour === r.shade) tones.shade++;
        else if (colour === r.dark) tones.dark++;
        else tones.off++;
      });
      expect(tones.light, `${id} light rim`).toBeGreaterThan(0);
      expect(tones.shade, `${id} shade band`).toBeGreaterThan(0);
      expect(tones.base, `${id} base kept`).toBeGreaterThan(tones.light + tones.shade);
      // 재질 픽셀은 반드시 그 재질 램프의 4단 중 하나다(이웃 재질 색이 새어 들어오지 않는다)
      expect(tones.off, `${id} colours outside its own ramp`).toBe(0);
    }
  });

  it('keeps eyes, glows, effect pixels and the outline at their flat palette colour', () => {
    for (const id of ids) {
      const art = ENEMY_SPRITES[id]!;
      const features = enemyShadeOptions(id, art).features;
      const dirty: string[] = [];
      eachPixel(id, (role, colour, x, y, i) => {
        if (features.includes(role) && colour !== art.palette[role]!) dirty.push(`${role}@${i}:${x},${y}=${colour}`);
      });
      expect(dirty.slice(0, 5), `${id} shaded feature pixels`).toEqual([]);
    }
  });

  it('keeps the silhouette outline black (선택적 외곽선을 꺼서 내부 검정선도 그대로다)', () => {
    for (const id of ids) {
      const art = ENEMY_SPRITES[id]!;
      const black = art.palette.K;
      if (!black) continue; // 무관심 안개는 외곽선 없이 옅은 테두리(f)만 쓴다
      const sheet = buildEnemySheet(id);
      let edge = 0, edgeBlack = 0;
      for (let y = 0; y < art.height; y++) for (let x = 0; x < art.width; x++) {
        const c = enemyPixel(sheet, art, 0, x, y);
        if (!c) continue;
        const onEdge = ([[0, -1], [0, 1], [-1, 0], [1, 0]] as [number, number][]).some(([dx, dy]) => {
          const nx = x + dx, ny = y + dy;
          return nx < 0 || ny < 0 || nx >= art.width || ny >= art.height || !enemyPixel(sheet, art, 0, nx, ny);
        });
        if (onEdge) { edge++; if (c === black) edgeBlack++; }
      }
      // 실측 최솟값: 문지기 0.27(기둥을 K 없이 P/p로 그렸다) · 무대 함정 0.76(가시 끝이 M) · 나머지는 0.84 이상.
      const floor = id === 'boss_top100_gate' ? 0.25 : 0.7;
      expect(edgeBlack / edge, `${id} black silhouette ratio`).toBeGreaterThan(floor);
    }
  });

  it('the guardian gets a contact shadow under its shoulder studs (규칙 (c) 접촉 그림자)', () => {
    const art = ENEMY_SPRITES.boss_trophy_guardian!;
    const dark = ramp(art.palette.F!).dark;
    let n = 0;
    eachPixel('boss_trophy_guardian', (role, colour) => { if (role === 'F' && colour === dark) n++; });
    expect(n, 'guardian contact shadow pixels').toBeGreaterThan(0);
  });
});
