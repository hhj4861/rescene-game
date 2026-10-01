/* global window */
// Original synthesized notes only; game timing never depends on audio availability.
export class ArcadeAudio {
  constructor(){this.enabled=false;this.context=null;this.nodes=new Set();this.scheduled=new Set();}
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
  stop(){for(const o of this.nodes){try{o.stop();}catch{/* Already ended. */}}this.nodes.clear();this.scheduled.clear();}
}
