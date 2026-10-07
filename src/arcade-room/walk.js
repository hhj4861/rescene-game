export const WALK_LANES=[100,240,380];
export const WALK_TIME_BONUS=10;
export const WALK_MAX_BONUS=60;
export const WALK_ITEMS=['treat','song','clock'];
// A repeating item rhythm guarantees music and time gifts in every round.
const ROUTE=['treat','puddle','treat','song','log','treat','clock','treat','puddle','log'];
export function createWalk(){
 return {walkVersion:1,lane:1,x:240,objects:[],spawn:.5,shield:0,fever:0,heat:0,hits:0,combo:0,bestCombo:0,misses:0,nextObject:0,jumpTime:0,jumpCooldown:0,songPickups:0,timeBonus:0,clockPickups:0,rewardTime:0,lastReward:''};
}
export function walkAction(s,a){
 if(a==='left'||a==='right')s.lane=Math.max(0,Math.min(2,s.lane+(a==='left'?-1:1)));
 else if(Number.isInteger(a)&&a>=0&&a<3)s.lane=a;
 else if(a==='jump'&&!s.jumpCooldown){s.jumpTime=.8;s.jumpCooldown=1.05;}
}
export function stepWalk(s,dt,speed,loseLife){
 s.x+=Math.sign(WALK_LANES[s.lane]-s.x)*Math.min(Math.abs(WALK_LANES[s.lane]-s.x),850*dt);
 for(const key of ['spawn','shield','fever','jumpTime','jumpCooldown','rewardTime'])s[key]=Math.max(0,s[key]-dt);
 if(!s.spawn){
  const kind=ROUTE[s.nextObject%ROUTE.length],lane=Math.floor(s.random()*3);
  s.objects.push({id:s.nextObject++,lane,y:110,kind});s.spawn=Math.max(.5,1.05/Math.sqrt(speed));
 }
 for(const o of s.objects){
  o.y+=(125+30*speed)*dt;
  if(Math.abs(WALK_LANES[o.lane]-s.x)<44&&o.y>=455&&o.y<=525){
   o.done=true;
   if(WALK_ITEMS.includes(o.kind)){
    s.itemPickups++;s.rewardTime=1.4;s.lastReward=o.kind;
    if(o.kind==='treat'){
     s.hits++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);s.score+=100+Math.min(10,s.combo)*10;s.event='walk-treat';
     if(++s.heat>=5){s.heat=0;s.fever=8;s.event='walk-fever';}
    }else if(o.kind==='song'){s.songPickups++;s.score+=50;s.event='walk-song';}
    else{const bonus=Math.min(WALK_TIME_BONUS,WALK_MAX_BONUS-s.timeBonus);s.timeBonus+=bonus;s.remaining+=bonus;s.clockPickups++;s.score+=50;s.lastReward=bonus?'clock':'clock-max';s.event='walk-clock';}
   }else if(!s.shield&&!s.fever&&!(o.kind==='log'&&s.jumpTime>0)){
    loseLife(s);s.shield=1.4;s.combo=0;s.heat=0;s.misses++;s.event='walk-miss';if(s.ended)return;
   }else if(o.kind==='log'&&s.jumpTime>0){s.score+=20;s.event='walk-jump';}
  }else if(o.y>560){o.done=true;if(o.kind==='treat'){s.combo=0;s.heat=0;}}
 }
 s.objects=s.objects.filter(o=>!o.done);
}
