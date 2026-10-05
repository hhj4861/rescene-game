export const RUNNER_X=[95,240,385];
export const LIV_SONG_SECONDS=20;
export const LIV_ITEM_INTERVAL=24;
import {RESCENE_SONGS} from './music.js';
export const LIV_ITEMS=Object.keys(RESCENE_SONGS);
export const LIV_ITEM_NAMES=Object.fromEntries(LIV_ITEMS.map(id=>[id,RESCENE_SONGS[id].title]));
export const LIV_ITEM_ICONS={'love-attack':'♥',pinball:'●','heart-drop':'♥',yoyo:'◎','new-world':'✧'};
export const LEGACY_LIV_ITEMS={wand:'love-attack',fairy:'pinball',meteor:'heart-drop',wings:'new-world'};
// Saturating stage curve keeps endless stages harder without unreactable speeds.
export function runnerDifficulty(stage=1){
 const level=Number.isSafeInteger(stage)&&stage>0?stage:1,ramp=1-1/(1+(level-1)*.1);
 return {hp:12+Math.round(32*ramp),bossHp:240+Math.round(660*ramp),spawn:1.35-.65*ramp,enemySpeed:52+34*ramp,bossSpeed:22+10*ramp,penalty:4+Math.floor(2*ramp)};
}
export function createRunner(){return {runnerVersion:1,upgradeVersion:1,songVersion:1,songItem:'',songTime:0,itemCooldown:0,effects:[],fireLevel:0,volley:1,bossSpawned:false,bossDefeated:0,pickups:[],item:'',itemTime:0,itemClock:0,itemCount:0,lane:1,x:240,squad:3,gatesTaken:0,gates:[{y:230,options:[{op:'add',value:3},{op:'multiply',value:1.5},{op:'add',value:-2}]}],gateSpawn:6,enemies:[],shots:[],defeated:0,spawn:1,nextEnemy:0,shotClock:0,charge:0,burst:0,gateFlash:0,lastGate:''};}
export function runnerAction(s,a){
 if(a==='left'||a==='right')s.lane=Math.max(0,Math.min(2,s.lane+(a==='left'?-1:1)));
 else if(Number.isInteger(a)&&a>=0&&a<3)s.lane=a;
 else if(a==='burst'&&s.charge===5){s.charge=0;s.burst=.35;for(const e of s.enemies)e.hp-=30;s.event='defense-burst';}
}
export function stepRunner(s,dt,speed,loseLife,target){
 const difficulty=runnerDifficulty(s.stage),intro=Math.min(1,s.gatesTaken/4);
 // Give a fresh squad four gates to build before applying full stage pressure.
 for(const key of ['hp','spawn','enemySpeed']){const start=runnerDifficulty(1)[key];difficulty[key]=start+(difficulty[key]-start)*intro;}
 s.x+=Math.sign(RUNNER_X[s.lane]-s.x)*Math.min(Math.abs(RUNNER_X[s.lane]-s.x),700*dt);
 for(const k of ['spawn','gateSpawn','shotClock','burst','gateFlash','itemTime','itemClock','songTime','itemCooldown'])s[k]=Math.max(0,s[k]-dt);
 if(!s.itemTime)s.item='';
 if(!s.songTime)s.songItem='';
 s.effects=s.effects.map(e=>({...e,ttl:e.ttl-dt})).filter(e=>e.ttl>0).slice(-24);
 if(!s.bossSpawned&&s.defeated>=target-1){
  const hp=difficulty.bossHp;s.enemies.push({id:s.nextEnemy++,lane:1,y:105,hp,maxHp:hp,boss:true});s.bossSpawned=true;s.event='defense-boss';
 }
 if(!s.spawn&&(!s.bossSpawned||!s.bossDefeated||s.defeated<target)&&s.enemies.length<(s.bossSpawned?6:12)){
  const id=s.nextEnemy++,hp=Math.ceil(difficulty.hp)+Math.min(8,Math.floor(id*.5));
  const lane=s.bossSpawned?(s.random()<.5?0:2):id===0?1:Math.floor(s.random()*3);
  s.enemies.push({id,lane,y:110,hp,maxHp:hp,boss:false});
  if(id%4===3&&s.enemies.length<(s.bossSpawned?6:12))s.enemies.push({id:s.nextEnemy++,lane:(lane+1)%3,y:110,hp,maxHp:hp,boss:false});
  s.spawn=difficulty.spawn*(s.bossSpawned?1.2:1);
 }
 if(!s.gateSpawn){
  const good=Math.floor(s.random()*3),options=Array.from({length:3},(_,lane)=>lane===good?{op:'multiply',value:1.5}:{op:'add',value:lane===(good+1)%3?2+Math.floor(s.random()*2):-difficulty.penalty});
  s.gates.push({y:115,options});s.gateSpawn=5.5;
 }
 for(const g of s.gates){
  g.y+=57*Math.sqrt(speed)*dt;
  if(g.y>=480){
   const option=g.options[RUNNER_X.reduce((best,x,i)=>Math.abs(x-s.x)<Math.abs(RUNNER_X[best]-s.x)?i:best,0)];
   s.squad=Math.max(0,Math.min(48,option.op==='multiply'?Math.floor(s.squad*option.value):s.squad+option.value));
   if(option.value>0){if(option.op==='multiply')s.volley=Math.min(5,s.volley+1);else s.fireLevel=Math.min(5,s.fireLevel+1);}
   s.gatesTaken++;s.lastGate=option.op==='multiply'?`×${option.value}`:`${option.value>0?'+':''}${option.value}`;s.gateFlash=.8;s.event=s.squad&&option.value>0?'defense-gate':'defense-miss';g.done=true;
   if(!s.squad){loseLife(s);s.squad=3;if(s.ended)return;}
  }
 }
 s.gates=s.gates.filter(g=>!g.done);
 for(const item of s.pickups){item.y+=110*dt;if(!s.itemCooldown&&Math.abs(RUNNER_X[item.lane]-s.x)<60&&item.y>=440&&item.y<=515){s.item=item.kind;s.itemTime=30;s.itemClock=0;s.songItem=item.kind;s.songTime=LIV_SONG_SECONDS;s.itemCooldown=LIV_ITEM_INTERVAL;item.y=600;s.itemPickups++;s.event='defense-item';}}
 s.pickups=s.itemCooldown?[]:s.pickups.filter(item=>item.y<540);
 const shot=(x,power)=>({x,y:455,power,kind:s.item,returning:false,hitIds:[]});
 if(!s.shotClock){
  const power=Math.ceil(s.squad/6)+(s.item?1:0)+(s.item==='love-attack'?1:0),volley=Math.min(5,s.volley+(s.item==='love-attack'?1:0));
  for(let i=0;i<volley;i++)s.shots.push(shot(s.x+(i-(volley-1)/2)*12,power));
  if(s.item==='new-world')for(const x of RUNNER_X)if(Math.abs(x-s.x)>60)s.shots.push(shot(x,power));
  s.shotClock=.28/(1+s.fireLevel*.3);
 }
 if(s.item==='heart-drop'&&!s.itemClock){for(const e of s.enemies)e.hp-=5;for(const x of RUNNER_X)s.effects.push({kind:'heart-drop',x,y:100,toX:x,toY:470,ttl:.45});s.itemClock=1;}
 for(const b of s.shots){
  const old=b.y;b.y+=650*dt*(b.returning?1:-1);
  if(b.kind==='yoyo'&&!b.returning&&b.y<110){b.y=110;b.returning=true;b.hitIds=[];}
  const e=s.enemies.filter(e=>e.hp>0&&!b.hitIds.includes(e.id)&&Math.abs(RUNNER_X[e.lane]-b.x)<(e.boss?55:28)&&e.y>=Math.min(b.y,old)-20&&e.y<=Math.max(b.y,old)+20).sort((a,b)=>b.y-a.y)[0];
  if(e){
   e.hp-=b.power;b.hitIds.push(e.id);
   if(b.kind==='pinball'){
    let from=e;const used=new Set([e.id]);
    for(let bounce=0;bounce<2;bounce++){const next=s.enemies.filter(n=>n.hp>0&&!used.has(n.id)&&Math.hypot(RUNNER_X[n.lane]-RUNNER_X[from.lane],n.y-from.y)<330).sort((a,b)=>Math.hypot(RUNNER_X[a.lane]-RUNNER_X[from.lane],a.y-from.y)-Math.hypot(RUNNER_X[b.lane]-RUNNER_X[from.lane],b.y-from.y))[0];if(!next)break;next.hp-=Math.max(1,Math.ceil(b.power*.8));used.add(next.id);s.effects.push({kind:'pinball',x:RUNNER_X[from.lane],y:from.y,toX:RUNNER_X[next.lane],toY:next.y,ttl:.35});from=next;}
   }
   if(b.kind!=='yoyo')b.y=-100;
  }
 }
 s.shots=s.shots.filter(b=>b.y>40&&b.y<=455).slice(-120);
 for(let i=s.enemies.length-1;i>=0;i--){
  const e=s.enemies[i];
  if(e.hp<=0){
   s.enemies.splice(i,1);s.defeated++;if(e.boss)s.bossDefeated=1;s.score+=e.boss?1000:100;s.charge=Math.min(5,s.charge+1);s.event=e.boss?'defense-boss-clear':'defense-hit';
   if(!e.boss&&!s.itemCooldown&&s.defeated%2===1&&!s.pickups.length)s.pickups.push({lane:(e.lane+1+s.itemCount%2)%3,y:e.y,kind:LIV_ITEMS[s.itemCount++%LIV_ITEMS.length]});
  }else{e.y+=(e.boss?difficulty.bossSpeed:difficulty.enemySpeed)*dt;if(e.y>=480){s.enemies.splice(i,1);s.squad=Math.max(1,s.squad-(e.boss?6:2));loseLife(s);s.event='defense-miss';if(e.boss){s.ended=true;s.endReason='boss';}if(s.ended)return;}}
 }
}
