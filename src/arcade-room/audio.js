/* global window, performance */
import {TRACKS,musicStep} from './music.js';
// Score and chart share the game timeline; Web Audio schedules notes precisely.
export class ArcadeAudio {
  constructor({now=()=>performance.now()}={}){this.now=now;this.voiceStartedAt=new Map();this.enabled=true;this.musicEnabled=true;this.voiceEnabled=true;this.context=null;this.nodes=new Set();this.musicNodes=new Set();this.transport=null;this.voice=null;this.voiceReport=null;this.voiceRequest=0;}
  async enable(value){
    this.enabled=value;if(!value){this.stop();return false;}
    try{this.context??=new (window.AudioContext||window.webkitAudioContext)();await this.context.resume();return true;}
    catch{this.enabled=false;return false;}
  }
  tone(frequency=600,delay=0,duration=.09){
    if(!this.enabled||!this.context||this.context.state!=='running')return;
    const c=this.context,o=c.createOscillator(),v=c.createGain(),at=c.currentTime+Math.max(0,delay);
    o.type='sine';o.frequency.value=frequency;v.gain.setValueAtTime(0,at);v.gain.linearRampToValueAtTime(.045,at+.008);v.gain.exponentialRampToValueAtTime(.001,at+duration);
    o.connect(v);v.connect(c.destination);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();v.disconnect();};o.start(at);o.stop(at+duration+.01);
  }
  tick(state){
    const c=this.context,track=TRACKS[state.kind];
    if(!this.enabled||!this.musicEnabled||!track||c?.state!=='running'||state.ended)return;
    // Keep one anchor across frames. Resuming or a stalled frame gets a new
    // anchor at the saved game time, never a burst of missed musical events.
    if(this.transport?.state!==state||Math.abs(c.currentTime-this.transport.origin-state.elapsed)>.12){
      this.stopMusic();this.transport={state,origin:c.currentTime-state.elapsed,next:Math.ceil((state.elapsed-.025)/(30/track.bpm))};
    }
    const t=this.transport,step=30/track.bpm;
    while(t.next*step<state.elapsed+.2){
      for(const n of musicStep(state.kind,t.next)){
        const at=t.origin+n.at;if(at<c.currentTime-.03)continue;
        this.musicNote(n,Math.max(c.currentTime,at));
      }
      t.next++;
    }
  }
  musicNote(n,at){
    const c=this.context,o=c.createOscillator(),v=c.createGain(),frequency=440*2**((n.pitch-69)/12);
    o.type=n.wave;o.frequency.setValueAtTime(frequency,at);
    if(n.drum)o.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*.3),at+n.duration);
    v.gain.setValueAtTime(.0001,at);v.gain.linearRampToValueAtTime(n.volume,at+.006);v.gain.exponentialRampToValueAtTime(.0001,at+n.duration);
    o.connect(v);v.connect(c.destination);this.musicNodes.add(o);o.onended=()=>{this.musicNodes.delete(o);o.disconnect();v.disconnect();};o.start(at);o.stop(at+n.duration+.01);
  }
  stopMusic(){
    for(const o of this.musicNodes){try{o.stop();}catch{/* Already ended. */}}
    this.musicNodes.clear();this.transport=null;
  }
  setMusic(value){this.musicEnabled=value;if(!value)this.stopMusic();}
  cancelVoice(){
    this.voiceRequest++;
    if(this.voice){this.voice.onplaying=null;this.voice.onended=null;this.voice.onerror=null;this.voice.pause();this.voice.removeAttribute('src');this.voice.load();this.voice=null;}
    this.voiceReport?.('음성 재생을 멈췄어요.');this.voiceReport=null;
  }
  async playVoice(source,report=()=>{},{minIntervalMs=0}={}){
    // Drop frequent automatic rewards; never queue or restart the active clip.
    // Keep timestamps across stop/pause and stage changes. Explicit replay bypasses this.
    const now=this.now();
    if(minIntervalMs>0&&(this.voice||now-(this.voiceStartedAt.get(source?.file)??-Infinity)<minIntervalMs))return false;
    this.cancelVoice();const request=this.voiceRequest;
    const current=()=>request===this.voiceRequest;
    if(!source?.file){report('연결된 음성이 없어요. 자막으로 확인해 주세요.');return false;}
    try{
      this.voiceStartedAt.set(source.file,now);
      const voice=new window.Audio(source.file);this.voice=voice;this.voiceReport=report;voice.volume=.85;
      const failed=()=>{if(current()){report('음성을 재생하지 못했어요. 다시 듣기를 눌러 주세요.');this.cancelVoiceQuietly();}};
      voice.onplaying=()=>{if(current())report('실제 멤버 음성 재생 중');};
      voice.onended=()=>{if(current()){report('원본 음성 · 방송 배경음 포함');this.cancelVoiceQuietly();}};
      voice.onerror=failed;report('멤버 음성 준비 중…');
      await voice.play();return current();
    }catch{if(current()){report('음성을 재생하지 못했어요. 다시 듣기를 눌러 주세요.');this.cancelVoiceQuietly();}return false;}
  }
  cancelVoiceQuietly(){this.voiceReport=null;this.cancelVoice();}
  stop(){this.cancelVoice();this.stopMusic();for(const o of this.nodes){try{o.stop();}catch{/* Already ended. */}}this.nodes.clear();}
}
