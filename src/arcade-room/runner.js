export const RUNNER_X=[95,240,385];
export const LIV_ITEMS=['wand','fairy','meteor','wings'];
export const LIV_ITEM_NAMES={wand:'응원봉',fairy:'음표 요정',meteor:'별똥별',wings:'오로라 날개'};
export function createRunner(){return {runnerVersion:1,upgradeVersion:1,fireLevel:0,volley:1,bossSpawned:false,bossDefeated:0,pickups:[],item:'',itemTime:0,itemClock:0,itemCount:0,lane:1,x:240,squad:3,gatesTaken:0,gates:[{y:230,options:[{op:'add',value:4},{op:'multiply',value:2},{op:'add',value:-2}]}],gateSpawn:6,enemies:[],shots:[],defeated:0,spawn:1,nextEnemy:0,shotClock:0,charge:0,burst:0,gateFlash:0,lastGate:''};}
export function runnerAction(s,a){
 if(a==='left'||a==='right')s.lane=Math.max(0,Math.min(2,s.lane+(a==='left'?-1:1)));
 else if(Number.isInteger(a)&&a>=0&&a<3)s.lane=a;
 else if(a==='burst'&&s.charge===5){s.charge=0;s.burst=.35;for(const e of s.enemies)e.hp-=12;s.event='defense-burst';}
}
export function stepRunner(s,dt,speed,loseLife,target){
 s.x+=Math.sign(RUNNER_X[s.lane]-s.x)*Math.min(Math.abs(RUNNER_X[s.lane]-s.x),700*dt);
 for(const k of ['spawn','gateSpawn','shotClock','burst','gateFlash','itemTime','itemClock'])s[k]=Math.max(0,s[k]-dt);
 if(!s.itemTime)s.item='';
 if(!s.bossSpawned&&s.defeated>=target-1){
  const hp=Math.ceil(32*speed);s.enemies.push({id:s.nextEnemy++,lane:1,y:105,hp,maxHp:hp,boss:true});s.bossSpawned=true;s.event='defense-boss';
 }
 if(!s.spawn&&(!s.bossSpawned||s.bossDefeated&&s.defeated<target)&&s.enemies.length<8){
  const id=s.nextEnemy++,hp=Math.ceil((3+Math.min(12,id*.25))*speed);
  s.enemies.push({id,lane:id===0?1:Math.floor(s.random()*3),y:110,hp,maxHp:hp,boss:false});s.spawn=2.1/Math.sqrt(speed);
 }
 if(!s.gateSpawn){
  const good=Math.floor(s.random()*3),options=Array.from({length:3},(_,lane)=>lane===good?{op:'multiply',value:2}:{op:'add',value:lane===(good+1)%3?3+Math.floor(s.random()*4):-2-Math.floor(speed*2)});
  s.gates.push({y:115,options});s.gateSpawn=5.5;
 }
 for(const g of s.gates){
  g.y+=57*Math.sqrt(speed)*dt;
  if(g.y>=480){
   const option=g.options[RUNNER_X.reduce((best,x,i)=>Math.abs(x-s.x)<Math.abs(RUNNER_X[best]-s.x)?i:best,0)];
   s.squad=Math.max(0,Math.min(60,option.op==='multiply'?s.squad*option.value:s.squad+option.value));
   if(option.value>0){if(option.op==='multiply')s.volley=Math.min(5,s.volley+1);else s.fireLevel=Math.min(5,s.fireLevel+1);}
   s.gatesTaken++;s.lastGate=option.op==='multiply'?`×${option.value}`:`${option.value>0?'+':''}${option.value}`;s.gateFlash=.8;s.event=s.squad&&option.value>0?'defense-gate':'defense-miss';g.done=true;
   if(!s.squad){loseLife(s);s.squad=3;if(s.ended)return;}
  }
 }
 s.gates=s.gates.filter(g=>!g.done);
 for(const item of s.pickups){item.y+=110*dt;if(Math.abs(RUNNER_X[item.lane]-s.x)<60&&item.y>=440&&item.y<=515){s.item=item.kind;s.itemTime=10;s.itemClock=0;item.y=600;s.itemPickups++;s.event='defense-item';}}
 s.pickups=s.pickups.filter(item=>item.y<540);
 if(!s.shotClock){
  const power=Math.ceil(s.squad/4)+(s.item==='wand'?2:0),volley=Math.min(5,s.volley+(s.item==='fairy'?2:0));
  for(let i=0;i<volley;i++)s.shots.push({x:s.x+(i-(volley-1)/2)*12,y:455,power});
  if(s.item==='wings')for(const x of RUNNER_X)if(Math.abs(x-s.x)>60)s.shots.push({x,y:455,power});
  s.shotClock=.28/(1+s.fireLevel*.3);
 }
 if(s.item==='meteor'&&!s.itemClock){for(const e of s.enemies)e.hp-=4;s.itemClock=1;s.burst=.2;}
 for(const b of s.shots){
  const old=b.y;b.y-=650*dt;
  const e=s.enemies.filter(e=>e.hp>0&&Math.abs(RUNNER_X[e.lane]-b.x)<(e.boss?55:28)&&e.y>=b.y-20&&e.y<=old+20).sort((a,b)=>b.y-a.y)[0];
  if(e){e.hp-=b.power;b.y=-100;}
 }
 s.shots=s.shots.filter(b=>b.y>40);
 for(let i=s.enemies.length-1;i>=0;i--){
  const e=s.enemies[i];
  if(e.hp<=0){
   s.enemies.splice(i,1);s.defeated++;if(e.boss)s.bossDefeated=1;s.score+=e.boss?1000:100;s.charge=Math.min(5,s.charge+1);s.event=e.boss?'defense-boss-clear':'defense-hit';
   if(!e.boss&&s.defeated%2===1&&s.pickups.length<3)s.pickups.push({lane:e.lane,y:e.y,kind:LIV_ITEMS[s.itemCount++%LIV_ITEMS.length]});
  }else{e.y+=(e.boss?18:38)*Math.sqrt(speed)*dt;if(e.y>=480){s.enemies.splice(i,1);s.squad=Math.max(1,s.squad-(e.boss?6:2));loseLife(s);s.event='defense-miss';if(e.boss){s.ended=true;s.endReason='boss';}if(s.ended)return;}}
 }
}
