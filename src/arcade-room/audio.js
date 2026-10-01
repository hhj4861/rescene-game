/* global window */
// Original synthesized notes only; game timing never depends on audio availability.
export class ArcadeAudio {
  constructor(){this.enabled=false;this.voiceEnabled=false;this.context=null;this.nodes=new Set();this.scheduled=new Set();}
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
    state.notes.forEach((n,i)=>{const delay=n.at-state.elapsed;if(delay>=0&&delay<.12&&!this.scheduled.has(i)){this.scheduled.add(i);this.tone(n.lane?660:440,delay,.12);}});
  }
  cancelVoice(){try{window.speechSynthesis?.cancel();}catch{/* Speech is optional. */}}
  speak(line,report=()=>{}){
    this.cancelVoice();
    if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){report('이 브라우저에서는 음성을 지원하지 않아요. 멘트는 자막으로 확인해 주세요.');return false;}
    try{
      const utterance=new window.SpeechSynthesisUtterance(line);utterance.lang='ko-KR';utterance.rate=.95;
      const korean=window.speechSynthesis.getVoices().find(v=>v.lang.startsWith('ko'));if(korean)utterance.voice=korean;
      utterance.onstart=()=>report('임시 합성 음성 재생 중');utterance.onend=()=>report('임시 합성 음성 · 실제 멤버 녹음 아님');utterance.onerror=()=>report('음성을 재생하지 못했어요. 다시 듣기를 눌러 주세요.');
      window.speechSynthesis.speak(utterance);report('임시 합성 음성 · 실제 멤버 녹음 아님');return true;
    }catch{report('음성을 재생하지 못했어요. 멘트는 자막으로 확인해 주세요.');return false;}
  }
  stop(){this.cancelVoice();for(const o of this.nodes){try{o.stop();}catch{/* Already ended. */}}this.nodes.clear();this.scheduled.clear();}
}
