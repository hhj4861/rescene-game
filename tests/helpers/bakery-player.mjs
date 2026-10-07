import {matches,boardSize,gameAction} from '../../src/arcade-room/model.js';
import {breadHunt,breadAreaCells} from '../../src/arcade-room/bakery-hunt.js';
// The player sees wrapper progress, not future random refills.
export function playBreadTurn(s){
 const size=boardSize(s),needed=new Set(breadHunt(s).flatMap(a=>breadAreaCells(a,size)).filter(i=>!s.breadCover[i]));
 if(s.rollingPins){const counts=Array.from({length:size},(_,r)=>[...needed].filter(i=>Math.floor(i/size)===r).length),row=counts.indexOf(Math.max(...counts));if(counts[row]>=2){gameAction(s,'rolling-pin');gameAction(s,row*size);return;}}
 const choices=[];
 for(let i=0;i<s.board.length;i++)for(const j of [i+1,i+size]){if(j>=s.board.length||(j===i+1&&Math.floor(i/size)!==Math.floor(j/size)))continue;const b=[...s.board];[b[i],b[j]]=[b[j],b[i]];const cells=matches(b);if(cells.length)choices.push({i,j,value:cells.filter(k=>needed.has(k)).length*10+cells.length});}
 choices.sort((a,b)=>b.value-a.value);const pick=choices[s.moves%Math.min(3,choices.filter(p=>p.value===choices[0]?.value).length)];if(pick)gameAction(s,{from:pick.i,to:pick.j});
}
