/* global document, window, performance, requestAnimationFrame, cancelAnimationFrame, ResizeObserver */
const $ = selector => document.querySelector(selector);
const canvas = $('#world'), loading = $('#load-state');
function failure(message) {
  loading.hidden=false;loading.replaceChildren();
  const text=document.createElement('p');text.textContent=message;loading.append(text);
  const reload=document.createElement('button');reload.textContent='다시 열기';reload.onclick=()=>window.location.reload();loading.append(reload);
  const back=document.createElement('a');back.href='/survival.html';back.textContent='기존 게임으로 돌아가기';loading.append(back);
  document.querySelectorAll('.camera-tools button,.members button,#greet,#motion').forEach(b=>{b.disabled=true;});
  canvas.dataset.ready='error';
}

async function start() {
  const [T,{createWorld},{members,createMember,createEmptyChair},{batchStatic}]=await Promise.all([
    import('/vendor/three/three.module.js'),import('./world.js'),import('./characters.js'),import('./primitives.js'),
  ]);
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const scene=new T.Scene();scene.background=new T.Color('#c3dedf');scene.fog=new T.Fog('#c3dedf',38,150);
  const world=createWorld(scene),characters=members.map((m,i)=>createMember(world.room,m,i));createEmptyChair(world.room);
  const originalGeometries=batchStatic(scene);originalGeometries.forEach(g=>g.dispose());
  const camera=new T.PerspectiveCamera(43,1,.1,250),target=new T.Vector3(),desiredTarget=new T.Vector3();
  const raycaster=new T.Raycaster(),pointer=new T.Vector2();
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused=reduceMotion.matches,selected=0,view='table',yaw=0,pitch=1.31,distance=7.5;
  let desiredYaw=yaw,desiredPitch=pitch,desiredDistance=distance;
  let greeted=new Set(),waveUntil=0,anim=0,last=0,elapsed=0,frames=0,disposed=false,contextAvailable=true;
  const stage=$('.stage');
  function setView(next,immediate=false) {
    view=next;const mobile=canvas.clientWidth<600;
    desiredYaw=next==='room'?.27:0;desiredPitch=next==='room'?1.07:1.36;
    desiredDistance=next==='room'?(mobile?14:10.7):(mobile?8.6:5.5);
    desiredTarget.set(0,next==='room'?1.20:1.48,-.08);
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===next)));
    if(immediate||paused){target.copy(desiredTarget);yaw=desiredYaw;pitch=desiredPitch;distance=desiredDistance;}
    stage.dataset.view=view;
  }
  function focusMember(i) {
    view='member';stage.dataset.view=view;
    const m=members[i];desiredTarget.set(m.x,1.78,m.z+.05);desiredYaw=m.yaw*.5;
    desiredPitch=1.38;desiredDistance=canvas.clientWidth<600?3.65:3.1;
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));
    if(paused){target.copy(desiredTarget);yaw=desiredYaw;pitch=desiredPitch;distance=desiredDistance;}
  }
  function showMember(i,focus=true) {
    selected=i;stage.dataset.member=members[i].id;
    document.querySelectorAll('[data-member]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.member)===i)));
    const m=members[i],done=greeted.has(i);$('#speaker').textContent=m.name;
    $('#line').textContent=done?m.reply:m.greeting;$('#subline').textContent=done?m.after:m.detail;
    updateButton();if(focus)focusMember(i);
  }
  function updateButton() {
    const button=$('#greet');button.replaceChildren();
    if(greeted.size===5)button.append('함께 둘러보기');
    else if(greeted.has(selected))button.append(`${members.find((_,i)=>!greeted.has(i)).name}에게 인사하러`);
    else button.append('반갑게 인사하기');
    const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');button.append(arrow);
  }
  function greet() {
    if(greeted.size===5){setView('table');$('#speaker').textContent='우리 여섯';$('#line').textContent='이제, 우리만의 계절을 시작해 볼까?';$('#subline').textContent='첫 인사를 모두 나눴어요. 다른 자리에서도 회의실을 둘러보세요.';return;}
    if(greeted.has(selected)){showMember(members.findIndex((_,i)=>!greeted.has(i)));return;}
    greeted.add(selected);waveUntil=elapsed+2.4;
    $(`[data-member="${selected}"]`).classList.add('greeted');$('#greet-count').textContent=`${greeted.size} / 5`;
    showMember(selected,false);
  }
  function updateMotion(){const button=$('#motion');button.setAttribute('aria-pressed',String(paused));button.textContent=paused?'동작 재생하기':'동작 멈추기';}
  $('#motion').onclick=()=>{paused=!paused;updateMotion();};updateMotion();
  const preferenceChanged=event=>{paused=event.matches;updateMotion();};reduceMotion.addEventListener('change',preferenceChanged);
  $('#greet').onclick=greet;
  document.querySelectorAll('[data-member]').forEach(b=>{b.onclick=()=>showMember(Number(b.dataset.member));});
  document.querySelectorAll('[data-view]').forEach(b=>{b.onclick=()=>setView(b.dataset.view);});
  $('#reset-view').onclick=()=>setView('table');
  const resize=new ResizeObserver(()=>{
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    if(view!=='member')setView(view,true);
  });resize.observe(canvas);
  const points=new Map();let down=null,moved=false,pinch=0;
  function pointerDown(e){canvas.focus({preventScroll:true});points.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);down=[e.clientX,e.clientY];moved=false;if(points.size===2){const [a,b]=[...points.values()];pinch=Math.hypot(a[0]-b[0],a[1]-b[1]);moved=true;}}
  function pointerMove(e){
    const old=points.get(e.pointerId);if(!old)return;
    points.set(e.pointerId,[e.clientX,e.clientY]);
    if(points.size===2){const[a,b]=[...points.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);desiredDistance=T.MathUtils.clamp(desiredDistance+(pinch-d)*.015,2.5,15);pinch=d;moved=true;}
    else{const dx=e.clientX-old[0],dy=e.clientY-old[1];desiredYaw=T.MathUtils.clamp(desiredYaw-dx*.004,-.68,.68);desiredPitch=T.MathUtils.clamp(desiredPitch-dy*.003,.88,1.5);if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)moved=true;}
  }
  function pointerUp(e){
    const wasDown=points.has(e.pointerId);points.delete(e.pointerId);
    if(wasDown&&!moved&&down){
      const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
      raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(characters.map(c=>c.root),true);
      if(hits.length){let object=hits[0].object;while(object&&object.userData.member===undefined)object=object.parent;if(object)showMember(object.userData.member);}
    }down=null;
  }
  function pointerCancel(e){points.delete(e.pointerId);down=null;moved=true;}
  function wheel(e){if(e.ctrlKey)return;e.preventDefault();desiredDistance=T.MathUtils.clamp(desiredDistance+e.deltaY*.006,2.5,15);}
  function key(e){
    if(e.altKey||e.ctrlKey||e.metaKey)return;
    if(e.key==='ArrowLeft')desiredYaw=Math.max(-.68,desiredYaw-.08);
    else if(e.key==='ArrowRight')desiredYaw=Math.min(.68,desiredYaw+.08);
    else if(e.key==='ArrowUp')desiredPitch=Math.max(.88,desiredPitch-.06);
    else if(e.key==='ArrowDown')desiredPitch=Math.min(1.5,desiredPitch+.06);
    else if(e.key==='Home')setView('table');
    else if(/^[1-5]$/.test(e.key))showMember(Number(e.key)-1);
    else return;e.preventDefault();
  }
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerCancel);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',key);
  function render(now) {
    if(disposed||!contextAvailable)return;
    const dt=Math.min((now-(last||now))/1000,.05);last=now;
    if(!paused)elapsed+=dt;
    const smoothing=paused?1:1-Math.exp(-dt*6);
    target.lerp(desiredTarget,smoothing);yaw=T.MathUtils.lerp(yaw,desiredYaw,smoothing);pitch=T.MathUtils.lerp(pitch,desiredPitch,smoothing);distance=T.MathUtils.lerp(distance,desiredDistance,smoothing);
    camera.position.set(target.x+Math.sin(yaw)*Math.sin(pitch)*distance,target.y+Math.cos(pitch)*distance,target.z+Math.cos(yaw)*Math.sin(pitch)*distance);camera.lookAt(target);
    characters.forEach((c,i)=>{
      c.upper.position.y=.86+(paused?0:Math.sin(elapsed*1.5+i)*.008);
      const gaze=T.MathUtils.clamp(Math.atan2(camera.position.x-members[i].x,camera.position.z-members[i].z)-c.baseYaw,-.34,.34);
      c.head.rotation.y=i===selected?gaze:Math.sin(elapsed*.32+i)*.045;
      c.head.rotation.z=paused?0:Math.sin(elapsed*.7+i)*.017;
      const blink=paused?1:((elapsed+i*.73)%4.9<.15?.12:1);c.eyes.forEach(eye=>{eye.scale.y=blink;});
      const waving=!paused&&i===selected&&elapsed<waveUntil;
      c.wave.visible=waving;c.arms[1].visible=!waving;c.wave.rotation.z=waving?Math.sin(elapsed*12)*.13:0;
    });
    world.boats.forEach((boat,i)=>{boat.position.y=-.33+(paused?0:Math.sin(elapsed*.8+i)*.035);boat.rotation.z=paused?0:Math.sin(elapsed*.65+i)*.03;});
    renderer.render(scene,camera);frames++;
    // Read-only render evidence for browser verification; no game-state or credentials.
    if(frames%30===0){canvas.dataset.frames=String(frames);canvas.dataset.camera=camera.position.toArray().map(v=>v.toFixed(3)).join(',');canvas.dataset.triangles=String(renderer.info.render.triangles);canvas.dataset.draws=String(renderer.info.render.calls);}
    anim=requestAnimationFrame(render);
  }
  const visibility=()=>{last=0;if(document.hidden){cancelAnimationFrame(anim);anim=0;}else if(!anim&&!disposed&&contextAvailable)anim=requestAnimationFrame(render);};document.addEventListener('visibilitychange',visibility);
  const contextLost=e=>{e.preventDefault();contextAvailable=false;cancelAnimationFrame(anim);anim=0;failure('3D 화면 연결이 끊어졌어요. 다시 열면 첫 만남부터 둘러볼 수 있어요.');};canvas.addEventListener('webglcontextlost',contextLost);
  function dispose(){
    disposed=true;cancelAnimationFrame(anim);resize.disconnect();document.removeEventListener('visibilitychange',visibility);reduceMotion.removeEventListener('change',preferenceChanged);
    const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material])){materials.add(m);if(m.map)textures.add(m.map);}});
    geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());renderer.dispose();
  }
  // A bfcache restore must retain its GPU resources; a real unload disposes them.
  window.addEventListener('pagehide',e=>{if(!e.persisted)dispose();});
  setView('table',true);showMember(0,false);renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();
  render(performance.now());loading.hidden=true;canvas.dataset.ready='true';
}

start().catch(()=>failure('이 브라우저에서 3D 장면을 열지 못했어요. WebGL을 지원하는 브라우저에서 다시 열어 주세요.'));
