// 유행어 음성 파일 슬롯. `public/assets/voice/<memeId>.ogg|mp3` 가 있을 때만 재생하고,
// 없으면 호출자가 블립(speakAs/sayMeme)으로 대체한다. Phaser Sound는 파일 재생 전용.
import type Phaser from 'phaser';

export const voiceFileKey = (memeId: string): string => `voice_${memeId}`;

export function hasVoiceFile(scene: Phaser.Scene, memeId: string): boolean {
  return scene.cache.audio.exists(voiceFileKey(memeId));
}

export function playVoiceFile(scene: Phaser.Scene, memeId: string): boolean {
  if (!hasVoiceFile(scene, memeId)) return false;
  scene.sound.play(voiceFileKey(memeId));
  return true;
}
