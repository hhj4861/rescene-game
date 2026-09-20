// Versioned deterministic game composition: no recorded artist audio or external service.
export const ARRANGEMENT_VERSION = 1;
export const DURATION = 60;
const memberIds = ['minami', 'woni', 'zena', 'liv', 'may'];
const profiles = {
  glow: { bpm: 96, root: 60, chords: [0, 9, 5, 7], scale: [0, 2, 4, 7, 9], name: '잔광', mode: 'dream' },
  wave: { bpm: 112, root: 62, chords: [0, 7, 9, 5], scale: [0, 2, 4, 7, 9], name: '물결', mode: 'disco' },
  spark: { bpm: 128, root: 57, chords: [0, 5, 8, 7], scale: [0, 3, 5, 7, 10], name: '불꽃', mode: 'electro' },
};
function hash(value) { let h = 2166136261; for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function generator(seed) { let s = seed || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
export function composePerformance(plan, evidence, seed = '') {
  if (!profiles[plan.music] || !['flow','groove','power'].includes(plan.dance) || !['none','adlib','danceBreak','unit'].includes(plan.risk) || plan.leads.length !== 5 || new Set(plan.leads).size !== 5 || plan.leads.some(id=>!memberIds.includes(id))) throw new Error('합의된 무대 계획이 필요합니다');
  const profile = profiles[plan.music], beat = 60 / profile.bpm, notes = [];
  const random = generator(hash(`${ARRANGEMENT_VERSION}:${seed}:${plan.music}`));
  const motif = Array.from({ length: 8 }, () => Math.floor(random() * profile.scale.length));
  const parts = plan.leads.map((memberId, i) => ({ memberId, start: i * 12, end: (i + 1) * 12, event: evidence.events.find(e=>e.memberId === memberId) }));
  const add = (instrument, time, length, midi, gain, pan = 0, voice = 0) => {
    if (time < DURATION) notes.push({ instrument, time: Math.max(0,time), length: Math.min(length,DURATION-time), midi, gain, pan, voice });
  };
  for (let n = 0; n * beat < DURATION; n++) {
    const t = n * beat, bar = Math.floor(n / 4), chord = profile.root + profile.chords[bar % 4];
    const part = parts[Math.min(4,Math.floor(t / 12))], voice = memberIds.indexOf(part.memberId);
    const energy = t < 12 ? .7 : t < 24 ? .9 : t < 36 ? 1 : t < 48 ? .8 : 1.1;
    const danceBreak = plan.risk === 'danceBreak' && t >= 36 && t < 48;
    const quality = (part.event?.quality ?? 70) / 100;
    if (n % 4 === 0) for (const [i, interval] of [0, profile.mode === 'electro' ? 3 : 4, 7, 11].entries()) add('pad',t,beat*3.8,chord+interval,.045*energy,(i-1.5)*.3);
    add('bass',t,beat*.72,chord-24+(n%4===3?7:0),.17*energy);
    if (profile.mode === 'disco' || plan.dance === 'power' || n%2===0) add('kick',t,.24,34,.32*energy);
    if (n%2===1) add('snare',t,.16,0,.11*energy);
    const divisions = plan.dance === 'power' || danceBreak ? 4 : plan.dance === 'groove' ? 2 : 1;
    for(let k=0;k<divisions;k++) add('hat',t+k*beat/divisions,.052,0,(k===0?.045:.024)*energy,k%2 ? -.35 : .35);
    // Distinct per-member motif/timbre, with the saved intent's phrasing and timing.
    if (!danceBreak) for(let k=0;k<2;k++) {
      if (part.event?.focus === 'breath' && n%4===3 && k===1) continue;
      const offset = ((part.event?.beatErrorMs || 0)/1000) * (k ? -.25 : .25);
      const pitch = profile.root + 12 + profile.scale[(motif[(n*2+k)%8]+voice)%5];
      const time = Math.max(part.start,t+k*beat/2+offset);
      add('lead',time,beat*(plan.dance==='flow'?.72:.38),pitch,.075*energy*(.65+quality*.35),(voice-2)*.18,voice);
      if(plan.risk==='unit' && t>=24 && t<36) add('lead',time,beat*.42,pitch-5,.035,-(voice-2)*.18,(voice+1)%5);
    }
    if (profile.mode !== 'dream' || t >= 24) add('pluck',t+beat*.5,beat*.6,chord+12+[0,7,12,7][n%4],.04*energy,.45);
    if (plan.risk==='adlib' && n%8===7) for(let k=0;k<4;k++) add('pluck',t+k*beat/4,beat*.28,profile.root+24+profile.scale[k],.055,-.3);
    if (danceBreak) for(let k=1;k<4;k++) add('snare',t+k*beat/4,.07,0,.05,k%2?.25:-.25);
  }
  return { version: ARRANGEMENT_VERSION, title: `${profile.name} · 우리 여섯의 무대`, duration:DURATION, bpm:profile.bpm, music:plan.music, dance:plan.dance, risk:plan.risk, direction:plan.direction, seed:String(seed), parts, notes };
}
export function renderPcm(score, sampleRate = 22050) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 48000) throw new Error('지원하지 않는 샘플 레이트');
  const length = Math.round(score.duration*sampleRate), left = new Float32Array(length), right = new Float32Array(length);
  const noise = generator(hash(`${score.seed}:percussion`));
  for(const note of score.notes) {
    const start = Math.round(note.time*sampleRate), count = Math.min(Math.round(note.length*sampleRate), length-start);
    const frequency = 440*2**((note.midi-69)/12), panL = Math.sqrt((1-note.pan)/2), panR = Math.sqrt((1+note.pan)/2);
    for(let i=0;i<count;i++) {
      const t=i/sampleRate, u=i/count, phase=t*frequency*2*Math.PI;
      let value, envelope = Math.min(1,t/.009)*Math.min(1,(note.length-t)/.06);
      if(note.instrument==='kick') { value=Math.sin(2*Math.PI*(45*t+90*.025*(1-Math.exp(-t/.025)))); envelope=Math.exp(-t*17); }
      else if(note.instrument==='snare') { value=(noise()*2-1)*.8+Math.sin(t*2*Math.PI*180)*.2; envelope=Math.exp(-t*28); }
      else if(note.instrument==='hat') { value=noise()*2-1; envelope=Math.exp(-t*75); }
      else if(note.instrument==='bass') value=Math.sin(phase)+.18*Math.sin(phase*2);
      else if(note.instrument==='pad') { value=(Math.sin(phase)+.3*Math.sin(phase*1.003)+.15*Math.sin(phase*2))*.65; envelope=Math.min(1,t/.12)*Math.min(1,(note.length-t)/.25); }
      else if(note.instrument==='pluck') { value=Math.sin(phase)+.23*Math.sin(phase*3); envelope*=Math.exp(-u*5); }
      else { value=Math.sin(phase)+(.08+note.voice*.045)*Math.sin(phase*2)+.07*Math.sin(phase*3); envelope*=.7+.3*Math.exp(-u*4); }
      const sample=value*envelope*note.gain;
      left[start+i]+=sample*panL;right[start+i]+=sample*panR;
    }
  }
  const delay = Math.round(sampleRate*60/score.bpm*.75);
  let peak=0;
  for(let i=0;i<length;i++) {
    if(i>=delay) { left[i]+=right[i-delay]*.13; right[i]+=left[i-delay]*.13; }
    const fade=Math.min(1,i/(sampleRate*.035),(length-i)/(sampleRate*1.1));
    left[i]*=fade;right[i]*=fade;
    peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
  }
  const gain=peak ? .86/Math.max(.86,peak) : 1;
  for(let i=0;i<length;i++) { left[i]*=gain;right[i]*=gain; }
  return { sampleRate, channels:[left,right], duration:score.duration };
}
export function encodeWav(pcm) {
  const frames=pcm.channels[0].length, bytes=new ArrayBuffer(44+frames*4), view=new DataView(bytes);
  const text=(at,value)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+frames*4,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,pcm.sampleRate,true);view.setUint32(28,pcm.sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frames*4,true);
  for(let i=0;i<frames;i++) for(let c=0;c<2;c++) view.setInt16(44+(i*2+c)*2,Math.round(Math.max(-1,Math.min(1,pcm.channels[c][i]))*32767),true);
  return bytes;
}
// Both animation and part captions read the same audio-clock position.
export function stageFrame(score,time,reducedMotion=false) {
  const second=Math.max(0,Math.min(score.duration-.001,time)), part=score.parts[Math.floor(second/12)];
  const beat=second*score.bpm/60, strong=score.dance==='power'?1:score.dance==='groove'?.65:.35;
  return { second, memberId:part.memberId, part:Math.floor(second/12), event:part.event,
    dancers:memberIds.map((id,i)=>{
      const lead=id===part.memberId, phase=beat*Math.PI*2+i*.45;
      const order=score.parts.findIndex(p=>p.memberId===id), slot=lead?2:(order>Math.floor(second/12)?order:order+1);
      const x=lead?50:15+([0,1,3,4][(slot+4)%4])*17.5;
      const y=lead?70:60;
      const amplitude=(part.event?.quality ?? 70)/100;
      const danceBreak=score.risk==='danceBreak'&&second>=36&&second<48;
      const movement=strong*(danceBreak?1.5:1);
      return { id, x:(danceBreak?15+i*17.5:x)+(reducedMotion?0:Math.sin(phase)*movement*1.8), y:(danceBreak?65:y)+(reducedMotion?0:Math.abs(Math.sin(phase))*movement*amplitude*3), rotate:reducedMotion?0:Math.sin(phase)*movement*6,
        arm:reducedMotion?0:Math.sin(phase)*movement*38+(lead&&score.risk==='adlib'?-25:0), leg:reducedMotion?0:Math.sin(phase)*movement*13, lead };
    }) };
}
