import Phaser from 'phaser';
import { sayMeme, sfx } from '../audio/audioSession';
import { MEMES } from '../data/index';
import type { MemberDef } from '../data/schema';
import { style } from '../ui/textStyles';
import { addPortrait } from '../ui/portrait';

/** 연출 전체 길이(스펙 §5: 1.2초, 전부 무적·적 정지). */
export const SUPER_TOTAL_MS = 1200;
const CUTIN_MS = 300;
const EFFECT_AT_MS = 700;

/** 자막 유행어와 같은 문장의 카드 id(음성 파일 슬롯 조회용). 없으면 필살기 스킬 id. */
function memeIdFor(member: MemberDef): string {
  return MEMES.find((m) => m.member === member.id && m.text === member.superText)?.id ?? member.superSkill;
}

/**
 * 유행어 필살기 연출. 오버레이 씬이 아니라 스테이지 씬 안에서 `physics.pause()` + 타임라인으로 돈다
 * (v0.1 씬 큐 교훈). 정지 → 컷인 슬라이드 → 큰 자막 + 음성 → 효과 콜백 → 정지 해제.
 */
export const SuperFx = {
  play(scene: Phaser.Scene, member: MemberDef, onEffect: () => void, onDone: () => void): void {
    const cam = scene.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const tint = Phaser.Display.Color.HexStringToColor(member.color).color;
    scene.physics.pause();
    sfx(scene, 'super');

    const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setScrollFactor(0).setDepth(100);
    const stripe = scene.add.rectangle(W / 2, H / 2, W, 150, tint, 0.35).setScrollFactor(0).setDepth(100);
    const cutin = addPortrait(scene, W + 140, H / 2 + 20, member.id, 1, 3, member.color).setScrollFactor(0).setDepth(101);   // 시그니처 표정 초상화
    scene.tweens.add({ targets: cutin, x: W * 0.74, duration: CUTIN_MS, ease: 'Cubic.easeOut' });
    const parts: Phaser.GameObjects.GameObject[] = [overlay, stripe, cutin];

    scene.time.delayedCall(CUTIN_MS, () => {
      const text = scene.add.text(W * 0.4, H / 2, member.superText, style(36, '#ffffff', {
        fontStyle: 'bold', stroke: member.color, strokeThickness: 8, align: 'center', wordWrap: { width: W * 0.6 },
      })).setOrigin(0.5).setScrollFactor(0).setDepth(102);
      parts.push(text);
      scene.tweens.add({ targets: text, x: '+=8', duration: 40, yoyo: true, repeat: 14 });
      sayMeme(scene, memeIdFor(member), member.superText, member.voice);
    });
    scene.time.delayedCall(EFFECT_AT_MS, () => {
      cam.flash(160, 255, 255, 255);
      onEffect();
    });
    scene.time.delayedCall(SUPER_TOTAL_MS, () => {
      for (const p of parts) p.destroy();
      scene.physics.resume();
      onDone();
    });
  },
};
