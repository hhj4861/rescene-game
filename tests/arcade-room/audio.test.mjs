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


test('member reactions rotate distinct clips, share a cooldown and do not consume suppressed turns',async t=>{
  const {audio,clips,setTime}=fixture(t),pool=['a','b','c'].map(file=>({file}));
  for(let i=0;i<4;i++){
    setTime(i*4000);const playing=audio.playReaction('may',pool);clips[i].resolve();assert.equal(await playing,true);
    assert.equal(clips[i].src,pool[i%3].file);
    assert.equal(await audio.playReaction('may',pool),false);clips[i].onended();
    setTime(i*4000+3999);assert.equal(await audio.playReaction('may',pool),false);
  }
  audio.voiceEnabled=false;setTime(20000);assert.equal(await audio.playReaction('may',pool),false);assert.equal(clips.length,4);
});
test('song rewards can replace a short reaction but never restart the same song during cooldown',async t=>{
 const {audio,clips,setTime}=fixture(t),song={file:'liv-song.mp3'},options={minIntervalMs:12000,interrupt:true};
 const reaction=audio.playReaction('liv',[{file:'liv-oh.mp3'}]);clips[0].resolve();await reaction;
 const singing=audio.playVoice(song,undefined,options);clips[1].resolve();assert.equal(await singing,true);assert.equal(clips[0].paused,true);
 assert.equal(await audio.playReaction('liv',[{file:'other.mp3'}]),false);
 setTime(5000);assert.equal(await audio.playVoice(song,undefined,options),false);assert.equal(clips[1].paused,undefined);
 audio.stop();setTime(11999);assert.equal(await audio.playVoice(song,undefined,options),false);
 setTime(12000);const again=audio.playVoice(song,undefined,options);clips[2].resolve();assert.equal(await again,true);
});
test('voice ducks the music bus only while playing and restores it on end, error and pause',async t=>{
 const {audio,clips}=fixture(t),ramps=[];
 audio.context={currentTime:0};audio.musicBus={gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(value){ramps.push(value);}}};
 for(const end of ['onended','onerror','stop']){
  const pending=audio.playVoice({file:'song.mp3'});const clip=clips.at(-1);clip.resolve();await pending;clip.onplaying();assert.equal(ramps.at(-1),.2);
  if(end==='stop')audio.stop();else clip[end]();assert.equal(ramps.at(-1),1);
 }
});

test('stopping an idle graph resets the music gain immediately, without waiting for rendering',async t=>{
 const {audio,clips}=fixture(t),values=[];audio.context={currentTime:12};audio.musicBus={gain:{value:.2,cancelScheduledValues(){},setValueAtTime(value){values.push(value);},linearRampToValueAtTime(){}}};
 const pending=audio.playVoice({file:'song.mp3'});clips[0].resolve();await pending;audio.stop();assert.equal(values.at(-1),1);
});
test('song rewards silence both music buses and restore them on completion or cancellation',async t=>{
 const {audio,clips}=fixture(t),ramps=[],external=[];
 audio.externalMusic=(active,song)=>external.push({active,song});audio.context={currentTime:0};audio.musicBus={gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(v){ramps.push(v);}}};
 for(const end of ['onended','onerror','stop']){
  const p=audio.playVoice({kind:'song',file:'score.mp3',title:'Cover'});const clip=clips.at(-1);clip.resolve();await p;clip.onplaying();assert.equal(ramps.at(-1),0);assert.deepEqual(external.at(-1),{active:true,song:true});if(end==='stop')audio.stop();else clip[end]();assert.equal(audio.voiceIsSong,false);assert.equal(ramps.at(-1),1);assert.equal(external.at(-1).active,false);
 }
});

test('item singing loops for a minute, survives stage cleanup, pauses and stops exactly at its remaining time',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {audio,clips,setTime}=fixture(t);
 const playing=audio.playVoice({kind:'song',file:'may-song.mp3',title:'May'},undefined,{durationSeconds:60,member:'may'});clips[0].onplaying();clips[0].resolve();await playing;assert.equal(clips[0].loop,true);
 setTime(20000);t.mock.timers.tick(20000);audio.stop({preserveSong:true});assert.equal(audio.voice,clips[0]);audio.pauseItemSong();assert.equal(audio.itemSongRemaining,40000);t.mock.timers.tick(60000);assert.equal(audio.voice,clips[0]);
 const resumed=audio.resumeItemSong();clips[0].resolve();await resumed;t.mock.timers.tick(39999);assert.equal(audio.voice,clips[0]);t.mock.timers.tick(1);assert.equal(audio.voice,null);assert.equal(clips[0].paused,true);
});

test('pausing a pending item song keeps it resumable after WebKit AbortError',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {audio,clips}=fixture(t),abort=Object.assign(Error('play interrupted by pause'),{name:'AbortError'});
 const first=audio.playVoice({kind:'song',file:'woni-song.mp3'},undefined,{durationSeconds:60,member:'woni'});audio.pauseItemSong();audio.stop({preserveSong:true});clips[0].reject(abort);await first;assert.equal(audio.voice,clips[0]);assert.equal(audio.itemSongRemaining,60000);
 const resume=audio.resumeItemSong();audio.pauseItemSong();clips[0].reject(abort);await resume;assert.equal(audio.voice,clips[0]);
 const next=audio.resumeItemSong();clips[0].onplaying();clips[0].resolve();await next;t.mock.timers.tick(60000);assert.equal(audio.voice,null);
});
test('a stale resume rejection never cancels a newer item song',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {audio,clips}=fixture(t);
 const first=audio.playVoice({kind:'song',file:'woni-song.mp3'},undefined,{durationSeconds:60,member:'woni'});clips[0].resolve();await first;
 const oldResume=audio.resumeItemSong(),next=audio.playVoice({kind:'song',file:'may-song.mp3'},undefined,{durationSeconds:60,member:'may'});clips[0].reject(Error('old failure'));await oldResume;assert.equal(audio.voice,clips[1]);clips[1].resolve();await next;audio.stop();
});

test('a full item song never loops and its natural end releases the song timer and music ducking',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {audio,clips}=fixture(t),messages=[];
 const play=audio.playVoice({kind:'song',file:'full-woni.mp3',loop:false},message=>messages.push(message),{durationSeconds:41,member:'woni'});clips[0].onplaying();clips[0].resolve();await play;assert.equal(clips[0].loop,false);assert.equal(audio.itemSongRemaining,41000);clips[0].onended();assert.equal(audio.voice,null);assert.equal(audio.itemSongTimer,null);assert.equal(audio.itemSongMember,null);assert.equal(audio.voiceIsSong,false);const before=[...messages];t.mock.timers.tick(42000);assert.deepEqual(messages,before);
});

test('remaining item song time follows playback, freezes on pause and expires for next-stage item gating',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {audio,clips,setTime}=fixture(t);const play=audio.playVoice({kind:'song',file:'full-woni.mp3',loop:false},undefined,{durationSeconds:41,member:'woni'});clips[0].onplaying();clips[0].resolve();await play;setTime(10000);assert.equal(audio.itemSongSecondsRemaining,31);audio.pauseItemSong();setTime(30000);assert.equal(audio.itemSongSecondsRemaining,31);audio.stop();assert.equal(audio.itemSongSecondsRemaining,0);
});
