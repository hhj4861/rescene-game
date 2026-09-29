// 게임 전역에서 공유하는 AudioBus 하나를 registry(`audio` 키)에 보관한다.
// 씬이 바뀌어도 같은 버스를 재사용해 BGM이 끊기지 않게 한다.
import type Phaser from 'phaser';
import { AudioBus } from './AudioBus';
import { speakNotes, type VoiceProfile } from '../systems/voice';
import type { SfxName } from './sfxData';
import { playVoiceFile } from './VoiceFiles';

const KEY = 'audio';

/** registry에 없으면 AudioBus.create()로 한 번 만들어 등록한다(실패해도 null로 등록해 재시도하지 않는다). */
export function getAudio(scene: Phaser.Scene): AudioBus | null {
  if (!scene.registry.has(KEY)) {
    scene.registry.set(KEY, AudioBus.create());
  }
  return (scene.registry.get(KEY) as AudioBus | null) ?? null;
}

export function speakAs(scene: Phaser.Scene, text: string, profile: VoiceProfile, gainScale = 0.6): void {
  const bus = getAudio(scene);
  if (!bus) return;
  bus.speak(speakNotes(text, profile), gainScale);
}

/** 유행어는 음성 파일이 있으면 파일, 없으면 블립으로 말한다. */
export function sayMeme(scene: Phaser.Scene, memeId: string, text: string, profile: VoiceProfile): void {
  if (playVoiceFile(scene, memeId)) return;
  speakAs(scene, text, profile);
}

export function sfx(scene: Phaser.Scene, name: SfxName): void {
  const bus = getAudio(scene);
  if (!bus) return;
  bus.sfx(name);
}
