import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArcadeAudio} from '../../src/arcade-room/audio.js';

function fixture(t){
  const clips=[];
  class Audio {
    constructor(src){this.src=src;clips.push(this);}
    play(){return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}
    pause(){this.paused=true;}
    removeAttribute(){this.src='';}
    load(){}
  }
  const original=globalThis.window;globalThis.window={Audio};
  t.after(()=>{globalThis.window=original;});
  return {audio:new ArcadeAudio(),clips};
}
test('replay cancels old audio and stale completion cannot overwrite the new status',async t=>{
  const {audio,clips}=fixture(t),messages=[];
  const first=audio.playVoice({file:'may.mp3'},s=>messages.push(s)),stale=clips[0].onended;
  const second=audio.playVoice({file:'liv.mp3'},s=>messages.push(s));
  assert.equal(clips[0].paused,true);assert.equal(clips[0].src,'');
  clips[1].onplaying();const before=[...messages];stale();clips[0].reject(Error('aborted'));
  assert.equal(await first,false);assert.deepEqual(messages,before);
  clips[1].resolve();assert.equal(await second,true);audio.stop();assert.equal(clips[1].paused,true);
});
test('autoplay rejection and media failure report a retry without throwing',async t=>{
  const {audio,clips}=fixture(t),messages=[];
  const rejected=audio.playVoice({file:'may.mp3'},s=>messages.push(s));clips[0].reject(Error('NotAllowedError'));
  assert.equal(await rejected,false);assert.match(messages.at(-1),/다시 듣기/);assert.equal(audio.voice,null);
  const failed=audio.playVoice({file:'bad.mp3'},s=>messages.push(s));clips[1].onerror();clips[1].resolve();
  assert.equal(await failed,false);assert.match(messages.at(-1),/다시 듣기/);assert.equal(audio.voice,null);
});
test('finish releases audio and a missing recording does not invoke TTS',async t=>{
  const {audio,clips}=fixture(t),messages=[];
  const play=audio.playVoice({file:'woni.mp3'},s=>messages.push(s));clips[0].resolve();assert.equal(await play,true);
  clips[0].onended();assert.match(messages.at(-1),/원본 음성/);assert.equal(audio.voice,null);
  assert.equal(await audio.playVoice(null,s=>messages.push(s)),false);assert.match(messages.at(-1),/연결된 음성/);
});
