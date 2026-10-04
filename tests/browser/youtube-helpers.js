/* global window */
export async function fakeApi(page,blocked=false){
 await page.addInitScript(value=>{window.ytBlocked=value;},blocked);
 await page.route('https://www.youtube.com/iframe_api',r=>r.fulfill({contentType:'application/javascript',body:`
 window.ytPlayers=[];window.YT={Player:class{
 constructor(mount,options){this.options=options;this.events=options.events;this.position=0;this.status=5;this.anchor=performance.now();this.frame=document.createElement('iframe');mount.replaceWith(this.frame);window.ytPlayers.push(this);queueMicrotask(()=>this.events.onReady({target:this}));}
 getIframe(){return this.frame;}getCurrentTime(){return this.position+(this.status===1?(performance.now()-this.anchor)/1000:0);}getPlayerState(){return this.status;}
 state(value){this.position=this.getCurrentTime();this.anchor=performance.now();this.status=value;this.events.onStateChange({data:value,target:this});}
 loadVideoById(value){this.loaded=value;this.position=value.startSeconds;this.anchor=performance.now();if(window.ytBlocked){this.state(5);this.events.onAutoplayBlocked({target:this});}else this.state(1);}
 seekTo(value){this.position=value;this.anchor=performance.now();}playVideo(){this.state(1);}pauseVideo(){this.state(2);}setVolume(value){this.volume=value;}mute(){this.muted=true;}unMute(){this.muted=false;}destroy(){this.state(2);this.frame.remove();this.destroyed=true;}
 }};window.onYouTubeIframeAPIReady();` }));
}
