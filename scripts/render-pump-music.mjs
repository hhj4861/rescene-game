// Render our original score into continuous, normalized music assets.
import {writeFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {PUMP_SONGS,musicStep} from '../src/arcade-room/music.js';
const work=process.env.ARCADE_MUSIC_WORK;if(!work)throw Error('Set ARCADE_MUSIC_WORK to the task artifact directory');
mkdirSync(work,{recursive:true});mkdirSync('public/arcade-room/music',{recursive:true});
const rate=44100,duration=60;
for(const song of Object.values(PUMP_SONGS)){
 const pcm=new Float32Array(rate*duration);
 for(let step=0;step*30/song.bpm<duration;step++)for(const n of musicStep('rhythm',step,song.id)){
  const start=Math.round(n.at*rate),count=Math.ceil(n.duration*rate),f=440*2**((n.pitch-69)/12);let phase=0;
  for(let j=0;j<count&&start+j<pcm.length;j++){
   const t=j/rate,attack=Math.min(1,t/.008),env=attack*Math.exp(-5*t/n.duration),hz=n.drum?f*Math.pow(.3,t/n.duration):f;phase+=2*Math.PI*hz/rate;
   // Band-limited harmonics give a clear melody without harsh square-wave edges.
   const value=n.wave==='sine'?Math.sin(phase):n.wave==='triangle'?Math.sin(phase)-Math.sin(phase*3)/9+Math.sin(phase*5)/25:Math.sin(phase)+Math.sin(phase*3)/3+Math.sin(phase*5)/5;
   pcm[start+j]+=value*n.volume*env;
  }
 }
 let peak=0;for(const sample of pcm)peak=Math.max(peak,Math.abs(sample));
 const wav=Buffer.alloc(44+pcm.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length*2,40);
 for(let i=0;i<pcm.length;i++){const fade=Math.min(1,(pcm.length-i)/(rate*.35));wav.writeInt16LE(Math.round(pcm[i]/peak*.82*fade*32767),44+i*2);}
 const temp=resolve(work,song.id+'.wav');writeFileSync(temp,wav);
 const result=spawnSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',temp,'-codec:a','libmp3lame','-b:a','128k',resolve('public/arcade-room',song.file)],{stdio:'inherit'});if(result.status)throw Error('MP3 render failed');unlinkSync(temp);console.log(song.id+' rendered (60 seconds)');
}
