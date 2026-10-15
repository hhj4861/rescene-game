import {LINK_FOODS,linkMenu} from './zena-foods.js';
import {collectSongTime} from './song-time.js';
export const linkSize=stage=>stage<=5?6:8;
const point=(i,size)=>({x:i%size,y:Math.floor(i/size)});
// Search empty cells plus a one-cell border; a route may turn at most twice.
export function linkPath(board,a,b){
 const size=Math.sqrt(board.length);
 if(!Number.isInteger(size)||!Number.isInteger(a)||!Number.isInteger(b)||a===b||!board[a]||board[a]!==board[b])return null;
 const start=point(a,size),end=point(b,size),dirs=[[1,0],[0,1],[-1,0],[0,-1]],queue=[],seen=new Map();
 for(let d=0;d<4;d++)queue.push({p:start,d,turns:0,path:[start]});
 for(let i=0;i<queue.length;i++){
  const {p,d,turns,path}=queue[i];
  for(let next=0;next<4;next++){
   const t=turns+(next!==d?1:0);if(t>2||next===(d+2)%4)continue;
   const q={x:p.x+dirs[next][0],y:p.y+dirs[next][1]};
   if(q.x< -1||q.y< -1||q.x>size||q.y>size)continue;
   if(q.x===end.x&&q.y===end.y)return [...path,q];
   if(q.x>=0&&q.y>=0&&q.x<size&&q.y<size&&board[q.y*size+q.x])continue;
   const key=`${q.x},${q.y},${next}`;if((seen.get(key)??3)<=t)continue;
   seen.set(key,t);queue.push({p:q,d:next,turns:t,path:[...path,q]});
  }
 }
 return null;
}
export function linkPair(board){
 for(let a=0;a<board.length;a++)if(board[a])for(let b=a+1;b<board.length;b++)if(board[a]===board[b]&&linkPath(board,a,b))return [a,b];
 return null;
}
function shuffled(values,random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function freshBoard(s){
 const size=linkSize(s.stage),occupied=Array(size*size).fill(1),board=[...occupied],menu=linkMenu(s.stage),pictures=shuffled(Array.from({length:size*size/2},(_,i)=>menu[i%menu.length]),s.random);
 // Assign matching pictures along a legal removal sequence, so every new board is solvable.
 while(occupied.some(Boolean)){
  const cells=shuffled(occupied.map((v,i)=>v?i:-1).filter(i=>i>=0),s.random);let pair;
  for(const a of cells){for(const b of cells)if(linkPath(occupied,a,b)){pair=[a,b];break;}if(pair)break;}
  const value=pictures.pop();for(const i of pair){board[i]=value;occupied[i]=0;}
 }
 return board;
}
export function createLink(s,options){
 Object.assign(s,{linkVersion:1,board:freshBoard(s),selected:-1,pairs:0,shuffles:2,flash:0,path:[],hint:[],hintTime:0,linkMessage:'',songDrops:Number.isSafeInteger(options.songDrops)&&options.songDrops>=0?options.songDrops:0,songPickups:0});
}
export function shuffleLink(s,automatic=false){
 const cells=s.board.map((v,i)=>v?i:-1).filter(i=>i>=0),values=cells.map(i=>s.board[i]);
 if(!cells.length)return;
 for(let n=0;n<30;n++){const mixed=shuffled(values,s.random);cells.forEach((i,j)=>{s.board[i]=mixed[j];});if(linkPair(s.board))break;}
 if(!linkPair(s.board)){
  // Keep every remaining pair, but move one matching pair onto a legal route.
  const occupied=s.board.map(v=>v?1:0),[a,b]=linkPair(occupied),match=cells.find(i=>i!==a&&s.board[i]===s.board[a]);
  [s.board[b],s.board[match]]=[s.board[match],s.board[b]];
 }
 s.selected=-1;s.hint=[];s.hintTime=0;s.path=[];s.linkMessage=automatic?'연결할 짝이 없어 자동으로 섞었어요.':'남은 음식의 자리를 섞었어요.';
}
export function linkAction(s,a){
 if(a==='song-pickup'){if(s.songDrops&&collectSongTime(s)){s.songDrops--;s.songPickups++;s.itemPickups++;s.event='bread-song';}return;}
 if(s.flash)return;
 if(a==='hint'){s.hint=linkPair(s.board)||[];s.hintTime=3;s.linkMessage='반짝이는 같은 음식 두 개를 눌러요.';return;}
 if(a==='shuffle'){if(s.shuffles){s.shuffles--;shuffleLink(s);}return;}
 if(!Number.isInteger(a)||a<0||a>=s.board.length||!s.board[a])return;
 s.hint=[];s.hintTime=0;s.linkMessage='';
 if(s.selected===a){s.selected=-1;return;}
 if(s.selected<0){s.selected=a;return;}
 const route=linkPath(s.board,s.selected,a);
 if(!route){s.selected=a;s.linkMessage='같은 음식을 빈 길로 연결해요. 최대 두 번 꺾을 수 있어요.';s.event='bread-invalid';return;}
 s.board[s.selected]=s.board[a]=0;s.selected=-1;s.path=route;s.flash=.35;s.pairs++;s.score+=150+Math.min(10,s.stage)*10;
 if(s.pairs%4===0&&!s.songItemTime&&!s.songDrops)s.songDrops=1;
 s.linkMessage='한 쌍 완성!';s.event='bread-match';
}
export function stepLink(s,dt){
 const was=s.flash;s.flash=Math.max(0,s.flash-dt);s.hintTime=Math.max(0,s.hintTime-dt);
 if(was&&!s.flash){s.path=[];if(s.board.some(Boolean)&&!linkPair(s.board))shuffleLink(s,true);}
 if(!s.hintTime)s.hint=[];
}
export function validLink(s){
 const int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b,size=linkSize(s.stage);
 return s.linkVersion===1&&Array.isArray(s.board)&&s.board.length===size*size&&s.board.every(n=>int(n,0,LINK_FOODS.length-1))&&LINK_FOODS.slice(1).map((_,i)=>i+1).every(n=>s.board.filter(v=>v===n).length%2===0)&&int(s.pairs,0,size*size/2)&&s.pairs*2+s.board.filter(Boolean).length===size*size&&int(s.selected,-1,s.board.length-1)&&(s.selected===-1||s.board[s.selected]>0)&&int(s.shuffles,0,2)&&int(s.songDrops,0,100000)&&int(s.songPickups,0,100000)&&Number.isFinite(s.flash)&&s.flash>=0&&s.flash<=.35&&Array.isArray(s.path)&&s.path.length<30&&s.path.every(p=>p&&int(p.x,-1,size)&&int(p.y,-1,size))&&Array.isArray(s.hint)&&s.hint.length<=2&&s.hint.every(i=>int(i,0,s.board.length-1))&&Number.isFinite(s.hintTime)&&s.hintTime>=0&&s.hintTime<=3&&typeof s.linkMessage==='string'&&s.linkMessage.length<=100;
}
