/* global window */
// Original game tones and short source recordings; timing never depends on audio.
export class ArcadeAudio {
  constructor(){this.enabled=true;this.voiceEnabled=true;this.context=null;this.nodes=new Set();this.scheduled=new Set();this.voice=null;this.voiceReport=null;this.voiceRequest=0;}
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
    if(!this.enabled||state.kind!=='rhythm')return;
    state.notes.forEach((n,i)=>{const delay=n.at-state.elapsed;if(delay>=0&&delay<.12&&!this.scheduled.has(i)){this.scheduled.add(i);this.tone([392,494,587,659,784][n.lane],delay,.12);}});
  }
  cancelVoice(){
    this.voiceRequest++;
    if(this.voice){this.voice.onplaying=null;this.voice.onended=null;this.voice.onerror=null;this.voice.pause();this.voice.removeAttribute('src');this.voice.load();this.voice=null;}
    this.voiceReport?.('음성 재생을 멈췄어요.');this.voiceReport=null;
  }
  async playVoice(source,report=()=>{}){
    this.cancelVoice();const request=this.voiceRequest;
    const current=()=>request===this.voiceRequest;
    if(!source?.file){report('연결된 음성이 없어요. 자막으로 확인해 주세요.');return false;}
    try{
      const voice=new window.Audio(source.file);this.voice=voice;this.voiceReport=report;voice.volume=.85;
      const failed=()=>{if(current()){report('음성을 재생하지 못했어요. 다시 듣기를 눌러 주세요.');this.cancelVoiceQuietly();}};
      voice.onplaying=()=>{if(current())report('실제 멤버 음성 재생 중');};
      voice.onended=()=>{if(current()){report('원본 음성 · 방송 배경음 포함');this.cancelVoiceQuietly();}};
      voice.onerror=failed;report('멤버 음성 준비 중…');
      await voice.play();return current();
    }catch{if(current()){report('음성을 재생하지 못했어요. 다시 듣기를 눌러 주세요.');this.cancelVoiceQuietly();}return false;}
  }
  cancelVoiceQuietly(){this.voiceReport=null;this.cancelVoice();}
  stop(){this.cancelVoice();for(const o of this.nodes){try{o.stop();}catch{/* Already ended. */}}this.nodes.clear();this.scheduled.clear();}
}
