export const FLAME_LANES=[100,240,380];
export function createFlame(){return {flameVersion:1,lane:1,x:240,objects:[],flames:[],spawn:.5,fireCooldown:0,shield:0,fever:0,heat:0,hits:0,combo:0,bestCombo:0,misses:0,nextObject:0};}
export function flameAction(s,a){
 if(a==='left'||a==='right')s.lane=Math.max(0,Math.min(2,s.lane+(a==='left'?-1:1)));
 else if(Number.isInteger(a)&&a>=0&&a<3)s.lane=a;
 else if(a==='fire'&&!s.fireCooldown){s.flames.push({x:s.x,y:460});s.fireCooldown=s.fever?.15:.5;}
}
export function stepFlame(s,dt,speed,loseLife){
 s.x+=Math.sign(FLAME_LANES[s.lane]-s.x)*Math.min(Math.abs(FLAME_LANES[s.lane]-s.x),850*dt);
 for(const key of ['spawn','fireCooldown','shield','fever'])s[key]=Math.max(0,s[key]-dt);
 if(!s.spawn){const lane=Math.floor(s.random()*3),kind=s.nextObject%3===0?'berry':s.nextObject%5===0?'water':'rock';s.objects.push({id:s.nextObject++,lane,y:110,kind});s.spawn=Math.max(.38, .9/Math.sqrt(speed));}
 for(const f of s.flames){const old=f.y;f.y-=650*dt;const hit=s.objects.find(o=>o.kind==='rock'&&Math.abs(FLAME_LANES[o.lane]-f.x)<38&&o.y>=f.y-25&&o.y<=old+25);if(hit){hit.done=true;f.y=-100;s.score+=40;s.event='flame-break';}}
 s.flames=s.flames.filter(f=>f.y>70);
 for(const o of s.objects){if(o.done)continue;o.y+=(145+35*speed)*dt;if(Math.abs(FLAME_LANES[o.lane]-s.x)<44&&o.y>=455&&o.y<=525){o.done=true;if(o.kind==='berry'){s.hits++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);s.score+=100+Math.min(10,s.combo)*10;s.itemPickups++;s.event='flame-berry';if(++s.heat>=5){s.heat=0;s.fever=8;s.event='flame-fever';}}else if(!s.shield&&!s.fever){loseLife(s);s.shield=1.4;s.combo=0;s.heat=0;s.misses++;s.event='flame-miss';if(s.ended)return;}}else if(o.y>560){o.done=true;if(o.kind==='berry'){s.combo=0;s.heat=0;}}}
 s.objects=s.objects.filter(o=>!o.done);
}
