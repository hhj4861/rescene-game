import {songItemSeconds} from './stage-songs.js';
export const SONG_ITEM_SECONDS={drive:60,blocks:60,photo:60,catch:20,rhythm:0};
// Gameplay time is independent of audio availability, volume and playback errors.
export function collectSongTime(s){
 if(s.ended||s.songItemTime>0||!SONG_ITEM_SECONDS[s.kind])return false;
 const bonus=Math.max(0,60-s.remaining);s.songTimeBonus+=bonus;s.remaining+=bonus;
 s.songItemTime=songItemSeconds(s);return true;
}
export function tickSongTime(s,dt){s.songItemTime=Math.max(0,s.songItemTime-dt);}
