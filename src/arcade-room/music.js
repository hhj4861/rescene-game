// Original instrumental scores. MIDI pitches are authored here; no sampled songs.
export const TRACKS={
 drive:{title:'반짝 꼬리 산책',bpm:132,wave:'square',root:60,chords:[0,5,7,0],melody:[12,16,19,16,14,17,21,17,19,23,21,19,16,14,12,7]},
 blocks:{title:'방울 위의 스텝',bpm:112,wave:'triangle',root:62,chords:[0,7,5,0],melody:[12,19,16,14,11,14,19,16,17,21,19,17,16,14,12,7]},
 photo:{title:'오븐 앞 오후',bpm:96,wave:'sine',root:65,chords:[0,9,5,7],melody:[16,19,14,12,21,19,16,14,17,16,12,9,14,19,17,14]},
 rhythm:{title:'Five Steps, One Stage',bpm:120,wave:'triangle',root:57,chords:[0,5,3,7],melody:[12,15,19,22,19,15,17,12,15,19,24,22,19,17,15,10]},
 catch:{title:'별빛 전진',bpm:128,wave:'sawtooth',root:50,chords:[0,3,5,7],melody:[12,12,19,15,15,22,19,15,17,17,24,20,19,22,26,19]},
};
export const RESCENE_SONGS={
 'love-attack':{id:'love-attack',title:'LOVE ATTACK',videoId:'9XttLI0oH0I',bpm:112,mood:'함께 뛰는 설렘 · 공식 MV',pattern:[0,2,4,2,1,3,0,4,2,1,2,3,4,0,1,3]},
 'pinball':{id:'pinball',title:'Pinball',videoId:'B8JJ8RNM-60',bpm:170,mood:'통통 튀는 발걸음 · 공식 MV',pattern:[0,4,1,3,2,0,3,4,1,2,4,0,3,1,2,4]},
 'heart-drop':{id:'heart-drop',title:'Heart Drop',videoId:'ByX8EZq8500',bpm:135,mood:'두근거리는 댄스 · 공식 MV',pattern:[2,0,2,4,1,2,3,2,0,1,4,3,2,4,0,2]},
 'yoyo':{id:'yoyo',title:'YoYo',videoId:'uDYy2UyO1X4',bpm:105,mood:'부드럽게 오가는 리듬 · 공식 MV',pattern:[0,1,2,3,4,3,2,1,0,2,4,2,1,3,0,4]},
 'new-world':{id:'new-world',title:'New World',videoId:'QNXeGm-Wkms',bpm:100,mood:'새롭게 펼쳐지는 무대 · 공식 MV',pattern:[0,3,2,1,4,2,0,4,1,3,2,0,3,1,4,2]},
};
export const DEFAULT_PUMP_SONG='love-attack';
export const PUMP_SONGS={
 ...RESCENE_SONGS,
 'five-steps':{...TRACKS.rhythm,id:'five-steps',file:'music/five-steps.mp3',mood:'처음 만나는 다섯 발판',pattern:[0,2,4,1,3,2,0,4,2,1,3,2,4,0,3,1]},
 'sea-breeze':{id:'sea-breeze',title:'바닷바람 스텝',file:'music/sea-breeze.mp3',mood:'여유롭게 흔들리는 해변의 리듬',bpm:108,wave:'triangle',root:60,chords:[0,5,9,7],melody:[12,16,19,24,21,19,16,14,17,21,24,21,19,16,14,12],pattern:[0,4,2,1,3,2,4,0,1,2,3,4,2,0,3,1]},
 'neon-rush':{id:'neon-rush',title:'네온 러시',file:'music/neon-rush.mp3',mood:'빠르게 달리는 오락실 댄스',bpm:144,wave:'square',root:55,chords:[0,3,7,5],melody:[12,19,24,19,15,22,27,22,19,26,31,26,17,24,29,24],pattern:[0,1,2,3,4,2,0,3,4,1,2,4,3,0,2,1]},
};
export const pumpSong=id=>Object.hasOwn(PUMP_SONGS,id)?PUMP_SONGS[id]:PUMP_SONGS['five-steps'];
export const trackFor=state=>state.kind==='rhythm'?pumpSong(state.songId):TRACKS[state.kind];
export const PUMP_BEAT=60/TRACKS.rhythm.bpm;
export const MUSIC_LOOP_BEATS=32;
export function musicStep(kind,index,songId){
 const t=kind==='rhythm'?pumpSong(songId):TRACKS[kind];if(t.videoId)return [];const beat=index/2,bar=Math.floor((beat%MUSIC_LOOP_BEATS)/4),section=Math.floor(beat/8)%4,root=t.root+t.chords[section],notes=[];
 const at=beat*60/t.bpm,add=(pitch,length,volume,wave=t.wave,drum=false)=>notes.push({at,pitch,duration:length*60/t.bpm,volume,wave,drum});
 if(index%2===0)add(root-12,.72,.032,'triangle');
 if(index%8===0)for(const interval of [0,kind==='rhythm'||kind==='catch'?3:4,7])add(root+interval,3.4,.012,'sine');
 const phrase=(Math.floor(beat)%16+Math.floor(bar/4)*4)%16;
 if(index%2===0||((kind==='rhythm'||kind==='drive')&&index%8===7))add(t.root+t.melody[phrase]+(bar%8>=4?12:0),index%2?.35:.68,.027,t.wave);
 if(index%4===0)add(36,.22,.075,'sine',true);
 if(index%4===2)add(78,.09,.018,'triangle',true);
 if((kind==='rhythm'||kind==='catch')&&index%2===1)add(102,.045,.008,'square',true);
 return notes;
}
