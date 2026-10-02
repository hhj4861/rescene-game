export const RUNNER_X=[95,240,385];
export function createRunner(){return {runnerVersion:1,lane:1,x:240,squad:3,gatesTaken:0,gates:[{y:230,options:[{op:'add',value:4},{op:'multiply',value:2},{op:'add',value:-2}]}],gateSpawn:6,enemies:[],shots:[],defeated:0,spawn:1,nextEnemy:0,shotClock:0,charge:0,burst:0,gateFlash:0,lastGate:''};}
export function runnerAction(s,a){
 if(a==='left'||a==='right')s.lane=Math.max(0,Math.min(2,s.lane+(a==='left'?-1:1)));
 else if(Number.isInteger(a)&&a>=0&&a<3)s.lane=a;
 else if(a==='burst'&&s.charge===5){s.charge=0;s.burst=.35;for(const e of s.enemies)e.hp-=12;s.event='defense-burst';}
}
export function stepRunner(s,dt,speed,loseLife){
 s.x+=Math.sign(RUNNER_X[s.lane]-s.x)*Math.min(Math.abs(RUNNER_X[s.lane]-s.x),700*dt);
 for(const k of ['spawn','gateSpawn','shotClock','burst','gateFlash'])s[k]=Math.max(0,s[k]-dt);
 if(!s.spawn&&s.enemies.length<9){
  const id=s.nextEnemy++,boss=id%5===4,hp=Math.ceil((boss?20:3+id*.25)*speed);
  s.enemies.push({id,lane:id===0?1:Math.floor(s.random()*3),y:75,hp,maxHp:hp,boss});s.spawn=2.1/Math.sqrt(speed);
 }
 if(!s.gateSpawn){
  const good=Math.floor(s.random()*3),options=Array.from({length:3},(_,lane)=>lane===good?{op:'multiply',value:2}:{op:'add',value:lane===(good+1)%3?3+Math.floor(s.random()*4):-2-Math.floor(speed*2)});
  s.gates.push({y:80,options});s.gateSpawn=5.5;
 }
 for(const g of s.gates){
  g.y+=57*Math.sqrt(speed)*dt;
  if(g.y>=480){
   const option=g.options[RUNNER_X.reduce((best,x,i)=>Math.abs(x-s.x)<Math.abs(RUNNER_X[best]-s.x)?i:best,0)];
   s.squad=Math.max(0,Math.min(60,option.op==='multiply'?s.squad*option.value:s.squad+option.value));
   s.gatesTaken++;s.lastGate=option.op==='multiply'?`×${option.value}`:`${option.value>0?'+':''}${option.value}`;s.gateFlash=.8;s.event=s.squad&&option.value>0?'defense-gate':'defense-miss';g.done=true;
   if(!s.squad){loseLife(s);s.squad=3;if(s.ended)return;}
  }
 }
 s.gates=s.gates.filter(g=>!g.done);
 if(!s.shotClock){s.shots.push({x:s.x,y:455,power:Math.ceil(s.squad/4)});s.shotClock=.28;}
 for(const b of s.shots){
  const old=b.y;b.y-=650*dt;
  const e=s.enemies.filter(e=>e.hp>0&&Math.abs(RUNNER_X[e.lane]-b.x)<(e.boss?42:28)&&e.y>=b.y-20&&e.y<=old+20).sort((a,b)=>b.y-a.y)[0];
  if(e){e.hp-=b.power;b.y=-100;}
 }
 s.shots=s.shots.filter(b=>b.y>40);
 for(let i=s.enemies.length-1;i>=0;i--){
  const e=s.enemies[i];
  if(e.hp<=0){s.enemies.splice(i,1);s.defeated++;s.score+=e.boss?500:100;s.charge=Math.min(5,s.charge+1);s.event='defense-hit';}
  else{e.y+=(e.boss?25:38)*Math.sqrt(speed)*dt;if(e.y>=480){s.enemies.splice(i,1);s.squad=Math.max(1,s.squad-(e.boss?6:2));loseLife(s);s.event='defense-miss';if(s.ended)return;}}
 }
}
