export const SONG_STEP=5000;
export const SONG_GAMES=['drive','blocks','photo','catch'];
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function songLedger(value){return {points:safe(value?.points)?value.points:0,claimed:safe(value?.claimed)?value.claimed:0,roundHigh:safe(value?.roundHigh)?value.roundHigh:0};}
// Credit only new round highs: recovering a fake-target penalty earns no duplicate points.
export function creditSongPoints(entry,score){
 const ledger=entry.songs??=songLedger();if(!safe(score))return 0;
 const gain=Math.max(0,score-ledger.roundHigh);ledger.roundHigh=Math.max(ledger.roundHigh,score);ledger.points=Math.min(Number.MAX_SAFE_INTEGER,ledger.points+gain);
 const reached=Math.floor(ledger.points/SONG_STEP)*SONG_STEP;
 if(reached<=ledger.claimed)return 0;ledger.claimed=reached;return reached;
}
export function nextSongScore(entry){return (Math.floor((entry.songs?.points||0)/SONG_STEP)+1)*SONG_STEP;}
