import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArcadeAudio} from '../../src/arcade-room/audio.js';

function fixture(t){
  const clips=[];let now=0;
  class Audio {
    constructor(src){this.src=src;clips.push(this);}
    play(){return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}
    pause(){this.paused=true;}
    removeAttribute(){this.src='';}
    load(){}
  }
  const original=globalThis.window;globalThis.window={Audio};
  t.after(()=>{globalThis.window=original;});
  return {audio:new ArcadeAudio({now:()=>now}),clips,setTime:value=>{now=value;}};
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

test('automatic reward spacing drops repeats without interrupting or queuing audio',async t=>{
  const {audio,clips,setTime}=fixture(t),source={file:'woni.mp3'},spacing={minIntervalMs:15000};
  const first=audio.playVoice(source,undefined,spacing);clips[0].resolve();assert.equal(await first,true);
  const request=audio.voiceRequest;
  assert.equal(await audio.playVoice(source,undefined,spacing),false);
  assert.equal(audio.voiceRequest,request);assert.equal(clips[0].paused,undefined);
  setTime(16000);assert.equal(await audio.playVoice(source,undefined,spacing),false,'a pending/playing clip is never restarted');
  clips[0].onended();assert.equal(clips.length,1,'suppressed rewards are not queued');
  const next=audio.playVoice(source,undefined,spacing);clips[1].resolve();assert.equal(await next,true);
});
test('spacing survives pause and allows a new reward at the boundary; manual replay bypasses it',async t=>{
  const {audio,clips,setTime}=fixture(t),source={file:'woni.mp3'},spacing={minIntervalMs:15000};
  const first=audio.playVoice(source,undefined,spacing);clips[0].resolve();await first;audio.stop();
  setTime(14999);assert.equal(await audio.playVoice(source,undefined,spacing),false);
  setTime(15000);const next=audio.playVoice(source,undefined,spacing);clips[1].resolve();assert.equal(await next,true);
  const manual=audio.playVoice(source);clips[2].resolve();assert.equal(await manual,true);assert.equal(clips[1].paused,true);
  const other=audio.playVoice({file:'may.mp3'});clips[3].resolve();assert.equal(await other,true);
});
