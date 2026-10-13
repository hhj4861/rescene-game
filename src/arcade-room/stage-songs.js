import {SCORE_SONGS} from './voices.js';
import {RESCENE_SONGS} from './music.js';
const MEMBERS={drive:'woni',blocks:'may',photo:'zena'};
export const STAGE_GROUP_SONGS=Object.values(RESCENE_SONGS).map(song=>({...song,kind:'song',file:`./voices/stage-${song.id}.mp3`,start:20,end:80,loop:false,itemSeconds:60,source:`https://www.youtube.com/watch?v=${song.videoId}&t=20s`}));
// Each six-stage tour begins with the member's cover, followed by five group songs.
export function stageItemSong(kind,stage=1){
 const member=MEMBERS[kind];if(!member)return null;
 const index=(Math.max(1,stage)-1)%6;
 return index===0?SCORE_SONGS[member]:STAGE_GROUP_SONGS[(index-1+Object.keys(MEMBERS).indexOf(kind))%5];
}
export function songItemSeconds(s){return stageItemSong(s.kind,s.stage)?.itemSeconds||(s.kind==='catch'?20:0);}
