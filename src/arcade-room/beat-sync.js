// A fixed beat grid needs its phase aligned with the particular video edit.
export function beatShift(taps,bpm){
 if(taps.length<6||!Number.isFinite(bpm)||bpm<=0||taps.some(t=>!Number.isFinite(t)))return null;
 const period=60/bpm,angles=taps.slice(-6).map(t=>t/period*Math.PI*2),x=angles.reduce((v,a)=>v+Math.cos(a),0)/6,y=angles.reduce((v,a)=>v+Math.sin(a),0)/6;
 if(Math.hypot(x,y)<.85)return null;
 return Math.round(Math.atan2(y,x)/(Math.PI*2)*period*1000)/1000;
}
export class MediaClock{
 read(raw,playing,now){
  if(!Number.isFinite(raw))return raw;
  if(!playing||raw!==this.raw){this.raw=raw;this.anchor=now;return raw;}
  // Smooth sparse iframe updates, but never invent more than 250 ms of media.
  return raw+Math.min(.25,Math.max(0,(now-this.anchor)/1000));
 }
 reset(){this.raw=undefined;this.anchor=0;}
}
