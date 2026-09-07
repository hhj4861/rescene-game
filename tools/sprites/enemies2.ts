// 2차 플랜 신규 잡몹 10종·보스 5종 도트 템플릿(감정·장애물의 의인화만, 실존 인물·로고 금지).
// 크기는 docs/superpowers/plans/2026-09-06-arcade-v0.2-a4-a5.md 공유 데이터 표 1·2와 정확히 같아야 한다.
import { pasteGrid, scale2, shiftGrid, type Grid } from '../pixel-art';
import type { EnemySprite } from './enemies';
import { digitsGrid, ellipseMask, layer, lineMask, rectMask, shapeFromMask, shiftVertical, subtractMask, unionMask, wobbleFrames, type Mask } from './shapes';

// ---------- 인이어 노이즈 24×24 (지직거리는 이어폰) ----------
const inearBody: Mask = unionMask(ellipseMask(24, 24, 11.5, 13, 10, 11), rectMask(24, 24, 10, 0, 4, 5));
const inearEyes: Mask = unionMask(ellipseMask(24, 24, 8, 12, 1.5, 1.5), ellipseMask(24, 24, 15, 12, 1.5, 1.5));
const INEAR_BASE: Grid = layer(shapeFromMask(inearBody, 'F', 'K'), shapeFromMask(inearEyes, 'E', 'E'));
const INEAR_ZAP: Grid = shapeFromMask(unionMask(rectMask(24, 24, 3, 3, 2, 2), rectMask(24, 24, 18, 5, 2, 2), rectMask(24, 24, 5, 17, 2, 2)), 'A', 'A');

// ---------- 무반응 관객 32×40 (팔짱 낀 실루엣, static) ----------
const audienceMask: Mask = unionMask(ellipseMask(32, 40, 15.5, 8, 7, 7), rectMask(32, 40, 6, 14, 20, 26, 4));
const armsBand: Mask = rectMask(32, 40, 5, 19, 22, 4);
const flatEyes: Mask = unionMask(rectMask(32, 40, 11, 9, 3, 1), rectMask(32, 40, 18, 9, 3, 1));
const AUDIENCE_BASE: Grid = layer(shapeFromMask(audienceMask, 'F', 'K'), shapeFromMask(armsBand, 'f', 'f'), shapeFromMask(flatEyes, 'K', 'K'));

// ---------- 차트 밖 유령 28×36 (101 숫자 유령) ----------
const ghostDome: Mask = unionMask(ellipseMask(28, 36, 13.5, 15, 12, 15), rectMask(28, 36, 1, 15, 26, 15));
const ghostScallop: Mask = unionMask(ellipseMask(28, 36, 6, 34, 4, 4), ellipseMask(28, 36, 14, 35, 4, 4), ellipseMask(28, 36, 22, 34, 4, 4));
const ghostNotch: Mask = unionMask(ellipseMask(28, 36, 10, 36, 3, 3), ellipseMask(28, 36, 18, 36, 3, 3));
const ghostMask: Mask = subtractMask(unionMask(ghostDome, ghostScallop), ghostNotch);
const ghostEyes: Mask = unionMask(ellipseMask(28, 36, 9, 14, 2, 2), ellipseMask(28, 36, 19, 14, 2, 2));
const GHOST_BASE: Grid = pasteGrid(layer(shapeFromMask(ghostMask, 'F', 'K'), shapeFromMask(ghostEyes, 'K', 'K')), digitsGrid('101', 'A'), 8, 19);

// ---------- 스케줄 폭탄 24×28 (달력 폭탄) ----------
const bombBody: Mask = ellipseMask(24, 28, 11.5, 19, 10, 9);
const bombTag: Mask = rectMask(24, 28, 7, 2, 10, 8, 1);
const bombFuse: Mask = lineMask(24, 28, 16, 0, 13, 3, 2);
const bombMask: Mask = unionMask(bombBody, bombTag, bombFuse);
const tagLines: Mask = unionMask(rectMask(24, 28, 8, 5, 8, 1), rectMask(24, 28, 8, 8, 8, 1));
const bombSpark: Mask = rectMask(24, 28, 15, 0, 2, 2);
const BOMB_BASE: Grid = layer(shapeFromMask(bombMask, 'F', 'K'), shapeFromMask(tagLines, 'D', 'D'), shapeFromMask(bombSpark, 'A', 'A'));

// ---------- 무관심 안개 40×32 (반투명 뭉게구름) ----------
const fogMask: Mask = unionMask(ellipseMask(40, 32, 10, 22, 9, 8), ellipseMask(40, 32, 20, 24, 14, 10), ellipseMask(40, 32, 30, 22, 9, 8));
const FOG_BASE: Grid = shapeFromMask(fogMask, 'F', 'f');

// ---------- 악플 까마귀 32×24 (말풍선 문 까마귀) ----------
const crowMask: Mask = unionMask(ellipseMask(32, 24, 13, 15, 9, 8), ellipseMask(32, 24, 22, 9, 6, 6), rectMask(32, 24, 4, 12, 10, 6, 2));
const crowBubble: Mask = unionMask(rectMask(32, 24, 26, 3, 6, 6, 1), rectMask(32, 24, 25, 8, 2, 2));
const crowEye: Mask = ellipseMask(32, 24, 24, 8, 1.2, 1.2);
const CROW_BASE: Grid = layer(shapeFromMask(crowMask, 'F', 'K'), shapeFromMask(crowBubble, 'W', 'K'), shapeFromMask(crowEye, 'A', 'A'));

// ---------- 카피캣 28×44 (거울 든 고양이) ----------
const catMask: Mask = unionMask(
  ellipseMask(28, 44, 14, 12, 9, 9), rectMask(28, 44, 5, 2, 5, 6, 3), rectMask(28, 44, 18, 2, 5, 6, 3),
  ellipseMask(28, 44, 14, 30, 10, 13), lineMask(28, 44, 3, 40, 1, 26, 3),
);
const catMirror: Mask = unionMask(ellipseMask(28, 44, 23, 22, 4, 4), rectMask(28, 44, 22, 26, 3, 6));
const catMirrorGlass: Mask = ellipseMask(28, 44, 23, 22, 2, 2);
const catEyes: Mask = unionMask(ellipseMask(28, 44, 11, 12, 1.3, 1.3), ellipseMask(28, 44, 17, 12, 1.3, 1.3));
const COPYCAT_BASE: Grid = layer(
  shapeFromMask(catMask, 'F', 'K'), shapeFromMask(catMirror, 'M', 'K'), shapeFromMask(catMirrorGlass, 'W', 'W'), shapeFromMask(catEyes, 'K', 'K'),
);

// ---------- 알고리즘 골렘 44×52 (톱니 돌골렘) ----------
const golemMask: Mask = unionMask(rectMask(44, 52, 4, 10, 36, 42, 6), rectMask(44, 52, 14, 0, 16, 12, 3));
const gearRing: Mask = subtractMask(ellipseMask(44, 52, 22, 28, 8, 8), ellipseMask(44, 52, 22, 28, 4, 4));
const gearTeeth: Mask = unionMask(rectMask(44, 52, 20, 17, 4, 3), rectMask(44, 52, 20, 36, 4, 3), rectMask(44, 52, 11, 26, 3, 4), rectMask(44, 52, 30, 26, 3, 4));
const golemEyes: Mask = unionMask(rectMask(44, 52, 18, 4, 3, 3), rectMask(44, 52, 24, 4, 3, 3));
const GOLEM_BASE: Grid = layer(
  shapeFromMask(golemMask, 'F', 'K'), shapeFromMask(unionMask(gearRing, gearTeeth), 'M', 'M'), shapeFromMask(golemEyes, 'A', 'A'),
);

// ---------- 스포트라이트 드론 28×20 (조명 프로펠러) ----------
const droneMask: Mask = unionMask(ellipseMask(28, 20, 14, 8, 8, 7), rectMask(28, 20, 10, 13, 8, 6, 2));
const droneRotor: Mask = rectMask(28, 20, 4, 0, 20, 2);
const droneBeam: Mask = unionMask(rectMask(28, 20, 11, 16, 6, 2), rectMask(28, 20, 9, 18, 10, 2));
const droneLens: Mask = ellipseMask(28, 20, 14, 8, 2, 2);
const DRONE_BASE: Grid = layer(
  shapeFromMask(droneMask, 'F', 'K'), shapeFromMask(droneRotor, 'K', 'K'), shapeFromMask(droneBeam, 'A', 'A'), shapeFromMask(droneLens, 'W', 'W'),
);

// ---------- 무대 트랩 32×16 (바닥 함정판, static) ----------
const trapPlate: Mask = rectMask(32, 16, 1, 6, 30, 10, 2);
const spikesDown: Mask = unionMask(rectMask(32, 16, 4, 4, 2, 3), rectMask(32, 16, 9, 4, 2, 3), rectMask(32, 16, 14, 4, 2, 3), rectMask(32, 16, 19, 4, 2, 3), rectMask(32, 16, 24, 4, 2, 3));
const spikesUp: Mask = unionMask(rectMask(32, 16, 4, 1, 2, 6), rectMask(32, 16, 9, 1, 2, 6), rectMask(32, 16, 14, 1, 2, 6), rectMask(32, 16, 19, 1, 2, 6), rectMask(32, 16, 24, 1, 2, 6));
const TRAP_PLATE: Grid = shapeFromMask(trapPlate, 'F', 'K');
const TRAP_RETRACTED: Grid = layer(TRAP_PLATE, shapeFromMask(spikesDown, 'M', 'M'));
const TRAP_ARMED: Grid = layer(TRAP_PLATE, shapeFromMask(spikesUp, 'M', 'M'));

// ---------- 첫 카메라 80×80 (삼각대 위 큰 카메라, S2 보스) ----------
const cameraLegs: Mask = unionMask(
  lineMask(80, 80, 40, 34, 14, 79, 4), lineMask(80, 80, 40, 34, 66, 79, 4), lineMask(80, 80, 40, 34, 40, 79, 4),
);
const cameraBody: Mask = unionMask(rectMask(80, 80, 16, 6, 48, 32, 5), cameraLegs);
const CAMERA_BODY: Grid = shapeFromMask(cameraBody, 'F', 'K');
const cameraFlash: Grid = shapeFromMask(rectMask(80, 80, 20, 10, 8, 6, 1), 'A', 'A');
const lensRing: Mask = ellipseMask(80, 80, 60, 22, 10, 10);
const CAMERA_CLOSED: Grid = layer(CAMERA_BODY, cameraFlash, shapeFromMask(lensRing, 'K', 'K'));
const CAMERA_OPEN: Grid = layer(
  CAMERA_BODY, cameraFlash, shapeFromMask(lensRing, 'L', 'K'), shapeFromMask(ellipseMask(80, 80, 60, 22, 5, 5), 'W', 'W'),
);

// ---------- TOP100 문지기 72×96 (S3 중간보스) ----------
const gateMask: Mask = unionMask(rectMask(72, 96, 4, 10, 8, 80, 2), rectMask(72, 96, 60, 10, 8, 80, 2), rectMask(72, 96, 4, 6, 64, 8, 2));
const guardMask: Mask = unionMask(ellipseMask(72, 96, 36, 30, 14, 14), rectMask(72, 96, 18, 42, 36, 54, 6));
const guardArms: Mask = rectMask(72, 96, 16, 50, 40, 5);
const guardEyes: Mask = unionMask(ellipseMask(72, 96, 30, 28, 2, 2), ellipseMask(72, 96, 42, 28, 2, 2));
const GATE_MASKED: Grid = layer(
  shapeFromMask(gateMask, 'P', 'p'), shapeFromMask(guardMask, 'F', 'K'), shapeFromMask(guardArms, 'f', 'f'), shapeFromMask(guardEyes, 'K', 'K'),
);
const GATE_BASE: Grid = pasteGrid(GATE_MASKED, scale2(digitsGrid('100', 'A')), 25, 8);

// ---------- 침묵 96×96 (입 지퍼 잠긴 그림자 얼굴, S3 최종) ----------
const silenceMask: Mask = unionMask(ellipseMask(96, 96, 48, 30, 26, 26), rectMask(96, 96, 10, 40, 76, 56, 10));
const silenceEyes: Mask = unionMask(ellipseMask(96, 96, 38, 26, 2, 2), ellipseMask(96, 96, 58, 26, 2, 2));
const zipperLine: Mask = lineMask(96, 96, 30, 50, 66, 50, 4);
const zipperTeethParts: Mask[] = [];
for (let x = 32; x <= 64; x += 4) zipperTeethParts.push(rectMask(96, 96, x, 47, 2, 3));
const zipperTeeth: Mask = unionMask(...zipperTeethParts);
const zipperPull: Mask = rectMask(96, 96, 62, 44, 6, 8, 1);
const SILENCE_BASE: Grid = layer(
  shapeFromMask(silenceMask, 'F', 'K'), shapeFromMask(silenceEyes, 'L', 'L'),
  shapeFromMask(zipperLine, 'M', 'M'), shapeFromMask(zipperTeeth, 'm', 'm'), shapeFromMask(zipperPull, 'M', 'K'),
);

// ---------- 카피캣 대장 48×72 (왕관 쓴 거울 고양이, S4 최종) ----------
const captainMask: Mask = unionMask(
  ellipseMask(48, 72, 24, 20, 13, 13), rectMask(48, 72, 10, 8, 6, 7, 3), rectMask(48, 72, 32, 8, 6, 7, 3),
  ellipseMask(48, 72, 24, 50, 16, 21), lineMask(48, 72, 6, 66, 2, 44, 4),
);
const crownMask: Mask = unionMask(rectMask(48, 72, 12, 4, 24, 5, 1), rectMask(48, 72, 13, 0, 4, 5), rectMask(48, 72, 22, 0, 4, 5), rectMask(48, 72, 31, 0, 4, 5));
const captainMirror: Mask = unionMask(ellipseMask(48, 72, 38, 40, 6, 6), rectMask(48, 72, 36, 45, 4, 8));
const captainEyes: Mask = unionMask(ellipseMask(48, 72, 20, 20, 1.6, 1.6), ellipseMask(48, 72, 28, 20, 1.6, 1.6));
const CAPTAIN_BASE: Grid = layer(
  shapeFromMask(captainMask, 'F', 'K'), shapeFromMask(crownMask, 'C', 'K'), shapeFromMask(captainMirror, 'M', 'K'),
  shapeFromMask(ellipseMask(48, 72, 38, 40, 3, 3), 'W', 'W'), shapeFromMask(captainEyes, 'K', 'K'),
);

// ---------- 트로피 수호자 96×112 (S5 최종) ----------
const guardianBody: Mask = unionMask(rectMask(96, 112, 16, 30, 64, 82, 8), rectMask(96, 112, 34, 4, 28, 24, 4));
const guardianShoulders: Mask = unionMask(ellipseMask(96, 112, 24, 40, 6, 6), ellipseMask(96, 112, 72, 40, 6, 6));
const trophyCup: Mask = subtractMask(
  unionMask(ellipseMask(96, 112, 48, 44, 11, 9), rectMask(96, 112, 45, 52, 6, 6), rectMask(96, 112, 38, 57, 20, 4, 1)),
  ellipseMask(96, 112, 48, 42, 7, 5),
);
const guardianEyes: Mask = unionMask(rectMask(96, 112, 40, 12, 4, 4), rectMask(96, 112, 52, 12, 4, 4));
const GUARDIAN_BASE: Grid = layer(
  shapeFromMask(unionMask(guardianBody, guardianShoulders), 'F', 'K'),
  shapeFromMask(guardianShoulders, 'A', 'A'),
  shapeFromMask(trophyCup, 'T', 'K'),
  shapeFromMask(guardianEyes, 'W', 'W'),
);

export const ENEMY_SPRITES_2: Record<string, EnemySprite> = {
  enemy_inear_noise: {
    width: 24, height: 24,
    palette: { K: '#1b2540', F: '#7dcfff', E: '#1b2540', A: '#f7768e' },
    frames: [INEAR_BASE, shiftVertical(INEAR_BASE, 1), layer(shiftGrid(INEAR_BASE, -1), INEAR_ZAP), layer(shiftGrid(INEAR_BASE, 1), shiftGrid(INEAR_ZAP, -1))],
  },
  enemy_apathetic_audience: {
    width: 32, height: 40,
    palette: { K: '#2a2e45', F: '#8a94c2', f: '#5f6890' },
    frames: wobbleFrames(AUDIENCE_BASE),
  },
  enemy_chart_ghost: {
    width: 28, height: 36,
    palette: { K: '#3a3a52', F: '#e6e6f0', A: '#9d7cd8' },
    frames: wobbleFrames(GHOST_BASE),
  },
  enemy_schedule_bomb: {
    width: 24, height: 28,
    palette: { K: '#241a1a', F: '#2b2b36', D: '#e0af68', A: '#ffd166' },
    frames: wobbleFrames(BOMB_BASE),
  },
  enemy_apathy_fog: {
    width: 40, height: 32,
    palette: { F: '#c3c6d4', f: '#9a9db0' },
    frames: wobbleFrames(FOG_BASE),
  },
  enemy_hate_crow: {
    width: 32, height: 24,
    palette: { K: '#0d0d14', F: '#1f1f2e', W: '#e6e6e6', A: '#f7768e' },
    frames: wobbleFrames(CROW_BASE),
  },
  enemy_copycat: {
    width: 28, height: 44,
    palette: { K: '#22263a', F: '#7a7f9e', M: '#c0caf5', W: '#ffffff' },
    frames: wobbleFrames(COPYCAT_BASE),
  },
  enemy_algorithm_golem: {
    width: 44, height: 52,
    palette: { K: '#2a2620', F: '#6b6355', M: '#c0caf5', A: '#9ece6a' },
    frames: wobbleFrames(GOLEM_BASE),
  },
  enemy_spotlight_drone: {
    width: 28, height: 20,
    palette: { K: '#20242e', F: '#3d4a6b', A: '#ffd166', W: '#ffffff' },
    frames: wobbleFrames(DRONE_BASE),
  },
  enemy_stage_trap: {
    width: 32, height: 16,
    palette: { K: '#1a1a24', F: '#3d3d4a', M: '#c0caf5' },
    frames: [TRAP_RETRACTED, shiftGrid(TRAP_RETRACTED, 1), TRAP_ARMED, shiftGrid(TRAP_ARMED, -1)],
  },
  boss_first_camera: {
    width: 80, height: 80,
    palette: { K: '#12131c', F: '#3d3d4a', L: '#c0caf5', W: '#ffffff', A: '#f7768e' },
    frames: [CAMERA_CLOSED, shiftGrid(CAMERA_CLOSED, 1), CAMERA_OPEN, shiftGrid(CAMERA_OPEN, -1)],
  },
  boss_top100_gate: {
    width: 72, height: 96,
    palette: { P: '#8a94c2', p: '#5b6390', F: '#3d4a6b', K: '#12131c', f: '#2b3550', A: '#c0caf5' },
    frames: wobbleFrames(GATE_BASE),
  },
  boss_silence: {
    width: 96, height: 96,
    palette: { K: '#0d0d14', F: '#1f1b2e', L: '#7a83b0', M: '#9aa3c7', m: '#6b7396' },
    frames: wobbleFrames(SILENCE_BASE),
  },
  boss_copycat_captain: {
    width: 48, height: 72,
    palette: { K: '#1a1b26', F: '#565f89', C: '#ffd166', M: '#c0caf5', W: '#ffffff' },
    frames: wobbleFrames(CAPTAIN_BASE),
  },
  boss_trophy_guardian: {
    width: 96, height: 112,
    palette: { K: '#12131c', F: '#3d3d4a', A: '#ffd166', T: '#e0af68', W: '#ffffff' },
    frames: wobbleFrames(GUARDIAN_BASE),
  },
};
