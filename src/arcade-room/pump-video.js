/* global window, document, setTimeout, clearTimeout */
let apiPromise;
export function loadYouTube(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady,script=document.createElement('script');
  const timer=setTimeout(()=>fail(),15000);
  function fail(){clearTimeout(timer);script.remove();apiPromise=null;reject(new Error('YouTube unavailable'));}
  window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);previous?.();resolve(window.YT);};
  script.src='https://www.youtube.com/iframe_api';script.onerror=fail;document.head.append(script);
 });return apiPromise;
}
// Only media time may advance a YouTube round. Seeking never consumes a burst of lives.
export function mediaAdvance(elapsed,time,playing){
 if(!playing||!Number.isFinite(time))return {dt:0,jump:false};
 const delta=time-elapsed;
 return {dt:delta<-.35||delta>1.25?0:Math.max(0,Math.min(60-elapsed,delta)),jump:delta<-.35||delta>1.25};
}
export class PumpVideo{
 constructor(host,song,report=()=>{}){this.host=host;this.song=song;this.report=report;this.player=null;this.disposed=false;this.ready=false;this.position=0;this.wanted=false;this.muted=false;this.ducked=false;this.syncing=true;this.timer=0;}
 async mount(){
  this.report('공식 영상 준비 중…');
  try{
   const YT=await loadYouTube();if(this.disposed||!this.host.isConnected)return;
   const mount=document.createElement('div');this.host.replaceChildren(mount);
   this.timer=setTimeout(()=>{if(!this.disposed&&!this.ready){this.wanted=false;this.report('공식 영상 연결이 늦어지고 있어요. 다시 켜기를 눌러 주세요.',true);}},15000);
   this.player=new YT.Player(mount,{width:'100%',height:'100%',videoId:this.song.videoId,playerVars:{playsinline:1,controls:1,rel:0,origin:window.location.origin},events:{
    onReady:()=>{if(this.disposed)return;clearTimeout(this.timer);this.ready=true;this.player.getIframe().title=`RESCENE · ${this.song.title} 공식 영상`;this.volume();if(this.wanted)this.play(this.position);},
    onStateChange:e=>{if(this.disposed)return;if(e.data===1&&!this.wanted){this.player.pauseVideo();return;}if(e.data===1)this.report(`재생 중 · ${this.song.title}`);else if(e.data===3)this.report('영상 불러오는 중 · 발판도 잠시 쉬어요');else if(e.data===2&&this.wanted)this.report('영상 일시정지 · 영상의 ▶ 버튼으로 이어가요');},
    onAutoplayBlocked:()=>{if(!this.disposed)this.report('영상의 ▶ 버튼을 눌러 시작해 주세요. 발판은 기다리고 있어요.');},
    onError:()=>{if(!this.disposed){this.wanted=false;this.report('공식 영상을 재생하지 못했어요. 다시 켜거나 다른 곡을 골라 주세요.',true);}}
   }});
  }catch{if(!this.disposed)this.report('공식 영상을 불러오지 못했어요. 연결을 확인하고 다시 켜 주세요.',true);}
 }
 play(position=0){
  this.position=position;this.wanted=true;this.syncing=true;
  if(!this.ready)return;
  this.volume();if(this.loaded){this.player.seekTo(position,true);this.player.playVideo();}else{this.loaded=true;this.player.loadVideoById({videoId:this.song.videoId,startSeconds:position,endSeconds:60});}
 }
 volume(){if(!this.ready)return;this.player.setVolume(this.ducked?20:75);if(this.muted)this.player.mute();else this.player.unMute();}
 setMuted(value){this.muted=value;this.volume();}
 setDucked(value){this.ducked=value;this.volume();}
 isPlaying(){return this.ready&&this.wanted&&!this.syncing&&this.player.getPlayerState()===1;}
 sample(elapsed){
  if(!this.ready||!this.wanted)return {dt:0,jump:false};
  const status=this.player.getPlayerState(),time=this.player.getCurrentTime();
  if(this.syncing){if(status!==1||Math.abs(time-this.position)>.75)return {dt:0,jump:false};this.syncing=false;}
  return mediaAdvance(elapsed,status===0&&time>=59.75?60:time,status===1||status===0&&time>=59.75);
 }
 pause(){this.wanted=false;if(this.ready)this.player.pauseVideo();this.report('공식 영상 일시정지');}
 destroy(){this.disposed=true;this.wanted=false;clearTimeout(this.timer);this.player?.destroy();this.player=null;this.host.replaceChildren();}
}
export function videoCard(song){return `<section class="pump-video-card" aria-label="${song.title} 공식 영상"><div class="pump-video-host" id="pump-video"><span>♪ 공식 영상은 재생을 누르면 준비돼요</span></div><p><b>RESCENE · ${song.title}</b><a href="https://www.youtube.com/watch?v=${song.videoId}" target="_blank" rel="noopener noreferrer">YouTube에서 보기 ↗</a></p></section>`;}
