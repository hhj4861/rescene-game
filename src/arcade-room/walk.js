export const WALK_LANES=[100,240,380];
export const WALK_TIME_BONUS=10;
export const WALK_MAX_BONUS=60;
export const WALK_TRANSFORM_SECONDS=20;
export const WALK_ITEMS=['treat','song','clock','charmander'];
// Every cycle guarantees music, extra time, a transformation and monsters.
const ROUTE=['treat','monster','song','log','treat','charmander','monster','clock','puddle','treat','monster','treat'];
export function createWalk(){
 return {walkVersion:1,lane:1,x:240,objects:[],spawn:.5,shield:0,fever:0,heat:0,hits:0,combo:0,bestCombo:0,misses:0,nextObject:0,jumpTime:0,jumpCooldown:0,songPickups:0,timeBonus:0,clockPickups:0,rewardTime:0,lastReward:'',transformTime:0,attackCooldown:0,shots:[],effects:[],defeated:0};
}
function attack(s){
 if(s.attackCooldown||s.shots.length>=32)return;
 const fire=s.transformTime>0;s.shots.push({x:s.x,y:465,kind:fire?'fire':'star'});s.attackCooldown=fire?.18:.38;
}
export function walkAction(s,a){
 if(a==='left'||a==='right')s.lane=Math.max(0,Math.min(2,s.lane+(a==='left'?-1:1)));
 else if(Number.isInteger(a)&&a>=0&&a<3)s.lane=a;
 else if(a==='jump'&&!s.jumpCooldown){s.jumpTime=.8;s.jumpCooldown=1.05;}
 else if(a==='attack')attack(s);
}
export function stepWalk(s,dt,speed,loseLife){
 s.x+=Math.sign(WALK_LANES[s.lane]-s.x)*Math.min(Math.abs(WALK_LANES[s.lane]-s.x),850*dt);
 for(const key of ['spawn','shield','fever','jumpTime','jumpCooldown','rewardTime','transformTime','attackCooldown'])s[key]=Math.max(0,s[key]-dt);
 for(const e of s.effects)e.ttl-=dt;s.effects=s.effects.filter(e=>e.ttl>0);
 if(s.transformTime)attack(s);
 if(!s.spawn){
  const kind=ROUTE[s.nextObject%ROUTE.length],lane=Math.floor(s.random()*3);
  s.objects.push({id:s.nextObject++,lane,y:110,kind,...(kind==='monster'?{hp:Math.min(3,1+Math.floor((s.stage-1)/4))}:{})});s.spawn=Math.max(.5,1.05/Math.sqrt(speed));
 }
 for(const o of s.objects)o.y+=(125+30*speed)*dt;
 // Resolve the nearest crossed monster before player collisions, once per shot.
 for(const shot of s.shots){
  const before=shot.y;shot.y-=(shot.kind==='fire'?650:500)*dt;
  const target=s.objects.filter(o=>!o.done&&o.kind==='monster'&&Math.abs(WALK_LANES[o.lane]-shot.x)<(shot.kind==='fire'?55:32)&&o.y>=shot.y-25&&o.y<=before+25).sort((a,b)=>b.y-a.y)[0];
  if(target){shot.done=true;target.hp-=shot.kind==='fire'?3:1;if(target.hp<=0){target.done=true;s.defeated++;s.score+=150;s.effects.push({x:WALK_LANES[target.lane],y:target.y,ttl:.45});s.event='walk-defeat';}}
 }
 s.shots=s.shots.filter(b=>!b.done&&b.y>=100);
 for(const o of s.objects){
  if(o.done)continue;
  if(Math.abs(WALK_LANES[o.lane]-s.x)<44&&o.y>=455&&o.y<=525){
   o.done=true;
   if(WALK_ITEMS.includes(o.kind)){
    s.itemPickups++;s.rewardTime=1.4;s.lastReward=o.kind;
    if(o.kind==='treat'){
     s.hits++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);s.score+=100+Math.min(10,s.combo)*10;s.event='walk-treat';
     if(++s.heat>=5){s.heat=0;s.fever=8;s.event='walk-fever';}
    }else if(o.kind==='song'){s.songPickups++;s.score+=50;s.event='walk-song';}
    else if(o.kind==='charmander'){s.transformTime=WALK_TRANSFORM_SECONDS;s.attackCooldown=0;s.score+=50;s.event='walk-transform';}
    else{const bonus=Math.min(WALK_TIME_BONUS,WALK_MAX_BONUS-s.timeBonus);s.timeBonus+=bonus;s.remaining+=bonus;s.clockPickups++;s.score+=50;s.lastReward=bonus?'clock':'clock-max';s.event='walk-clock';}
   }else if(!s.shield&&!s.fever&&!(o.kind==='log'&&s.jumpTime>0)){
    loseLife(s);s.shield=1.4;s.combo=0;s.heat=0;s.misses++;s.event='walk-miss';if(s.ended)return;
   }else if(o.kind==='log'&&s.jumpTime>0){s.score+=20;s.event='walk-jump';}
  }else if(o.y>560){o.done=true;if(o.kind==='treat'){s.combo=0;s.heat=0;}}
 }
 s.objects=s.objects.filter(o=>!o.done);
}
