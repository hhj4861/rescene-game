/* global document, window, requestAnimationFrame, cancelAnimationFrame, ResizeObserver */
// One persistent renderer is moved between game panels. Polling never creates
// another WebGL context, resets the camera, or owns a second game state.
let artPromise, controller, loading, pending, stageFrame;
const order=['woni','liv','minami','may','zena'];
const element=document.createElement('div');element.className='live-world';
element.innerHTML='<canvas tabindex="0" aria-label="멤버를 눌러 의견을 듣고, 드래그로 둘러보세요."></canvas><p class="world-loading" role="status">멤버들을 만나러 가는 중이에요.</p><div class="world-controls"><button type="button" data-world="all">모두 보기</button><button type="button" data-world="motion">동작 멈추기</button></div>';
const canvas=element.querySelector('canvas'),notice=element.querySelector('.world-loading');
async function art(){return artPromise ||= import('./dolls.js').then(m=>m.loadDollArt()).catch(e=>{artPromise=null;throw e;});}
export function hydrateDollPortraits(root){
  art().then(frames=>{
    root.querySelectorAll('[data-doll-portrait]').forEach(el=>{
      const frame=frames[order.indexOf(el.dataset.dollPortrait)]?.[0];if(!frame)return;
      frame.url ||= frame.texture.image.toDataURL('image/png');
      const image=el.querySelector('img');if(image)image.src=frame.url;
    });
  }).catch(()=>{root.querySelectorAll('[data-doll-portrait]').forEach(el=>{el.textContent=el.dataset.dollPortrait;});});
}
export function mountGameWorld(host,options){
  pending=options;host.append(element);element.dataset.scene=options.scene;
  controller?.configure(options);
  if(!loading)loading=start().catch(error=>{
    canvas.dataset.ready='error';notice.hidden=false;notice.textContent=error.code==='DOLL_LOAD'?error.message:'입체 화면을 열지 못했어요. 아래 멤버 버튼으로 게임을 계속할 수 있어요.';
    element.querySelectorAll('button').forEach(b=>b.disabled=true);
  });
}
export function selectWorldMember(id,focus=false){controller?.select(id,focus);}
export function setPerformanceFrame(frame){stageFrame=frame;}

async function start(){
  const [T,{createWorld},{members,chair,createEmptyChair},{createDoll,updateDoll},{batchStatic},frames]=await Promise.all([
    import('/vendor/three/three.module.js'),import('./world.js'),import('./characters.js'),import('./dolls.js'),import('./primitives.js'),art(),
  ]);
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const scene=new T.Scene(),environment=new T.Group(),actors=new T.Group(),stage=new T.Group();scene.add(environment,actors,stage);
  const world=createWorld(environment);
  members.forEach(m=>chair(world.room,m.x,m.z,m.yaw));createEmptyChair(world.room);
  const characters=members.map((m,i)=>createDoll(actors,m,i,frames[i]));
  const add=(geometry,color,x,y,z)=>{const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.65}));mesh.position.set(x,y,z);stage.add(mesh);return mesh;};
  const floor=add(new T.CylinderGeometry(4.5,4.7,.24,64),'#263c58',0,-.15,0);floor.scale.z=.62;floor.receiveShadow=true;
  add(new T.BoxGeometry(10,5,.12),'#15223f',0,2,-2);
  for(let i=0;i<13;i++)add(new T.BoxGeometry(.07,3.8,.06),i%2?'#799bc1':'#c9a774',-4.5+i*.75,2,-1.9);
  stage.add(new T.HemisphereLight('#e4eaff','#394366',2.5));
  const spotlight=new T.PointLight('#ffe8be',35,12);spotlight.position.set(0,4,2);stage.add(spotlight);
  const original=batchStatic(environment);original.forEach(g=>g.dispose());
  const camera=new T.PerspectiveCamera(43,1,.1,250),target=new T.Vector3();
  const raycaster=new T.Raycaster(),pointer=new T.Vector2();
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused=reduce.matches,elapsed=0,last=0,raf,disposed=false,lost=false,mode,selected='woni',focused=false,yaw=0,pitch=1.36,draws=0;
  function motionLabel(){element.querySelector('[data-world="motion"]').textContent=paused?'동작 재생하기':'동작 멈추기';element.querySelector('[data-world="motion"]').setAttribute('aria-pressed',String(paused));}
  function resize(){const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(element);
  function configure(options){
    if(mode!==options.scene){mode=options.scene;focused=['planning','reflection'].includes(mode);yaw=0;pitch=1.36;}
    selected=options.selectedMember||selected;
    const performance=mode==='performance';environment.visible=!performance;stage.visible=performance;
    scene.background=new T.Color(performance?'#15223f':'#c3dedf');scene.fog=performance?null:new T.Fog('#c3dedf',38,150);
    element.querySelector('.world-controls').hidden=performance;
    resize();
  }
  function select(id,focus){if(!order.includes(id))return;selected=id;if(focus){focused=true;characters[order.indexOf(id)].greetingAt=elapsed;}}
  controller={configure,select};configure(pending);motionLabel();
  element.querySelector('[data-world="all"]').onclick=()=>{focused=false;yaw=0;pitch=1.36;};
  element.querySelector('[data-world="motion"]').onclick=()=>{paused=!paused;motionLabel();};
  const preference=e=>{paused=e.matches;motionLabel();};reduce.addEventListener('change',preference);
  let drag;
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||mode==='performance')return;yaw=T.MathUtils.clamp(yaw-(e.clientX-drag.x)*.003,-.5,.5);pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.y)*.002,1.1,1.5);drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6;drag.x=e.clientX;drag.y=e.clientY;});
  canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('pointerup',e=>{
    if(drag&&!drag.moved){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
      const hit=raycaster.intersectObjects([mode==='performance'?stage:environment,actors],true)[0];let object=hit?.object;
      while(object&&object.userData.member===undefined)object=object.parent;
      if(object){const id=members[object.userData.member].id;select(id,true);pending.onSelect?.(id);}
    }drag=null;
  });
  canvas.addEventListener('keydown',e=>{
    if(e.altKey||e.metaKey||e.ctrlKey)return;
    if(/^[1-5]$/.test(e.key)){const id=order[Number(e.key)-1];select(id,true);pending.onSelect?.(id);}
    else if(e.key==='Home'){focused=false;yaw=0;}
    else if(e.key==='ArrowLeft')yaw=Math.max(-.5,yaw-.08);
    else if(e.key==='ArrowRight')yaw=Math.min(.5,yaw+.08);
    else return;e.preventDefault();
  });
  function render(now){
    if(disposed||lost)return;
    const dt=Math.min((now-(last||now))/1000,.05);last=now;
    if(element.isConnected&&element.clientWidth&&element.clientHeight&&!document.hidden){
      if(!paused)elapsed+=dt;
      const performance=mode==='performance',member=members[order.indexOf(selected)],focus=focused&&!performance;
      target.set(focus?member.x:0,focus?1.82:1.42,focus?member.z:0);
      const distance=focus?4.0:Math.max(6.4,4.8/Math.max(.45,camera.aspect));
      camera.position.set(target.x+Math.sin(yaw)*distance,target.y+Math.cos(pitch)*distance,target.z+Math.cos(yaw)*Math.sin(pitch)*distance);camera.lookAt(target);
      characters.forEach((c,i)=>{
        if(performance){
          const actor=stageFrame?.dancers?.find(a=>a.id===members[i].id);
          const lead=stageFrame?.memberId===members[i].id;
          c.root.position.set(actor?(actor.x-50)*.095:(i-2)*1.2,0,lead?.35:-.15);
          c.frames.forEach((m,j)=>m.visible=j===2);c.pose=2;
          c.pivot.position.y=frames[i][2].height*.0056+.08+(actor&&!reduce.matches?(actor.y-(lead?70:60))*.02:0);
          c.pivot.rotation.set(0,Math.atan2(camera.position.x-c.root.position.x,camera.position.z-c.root.position.z),reduce.matches?0:(actor?.rotate||0)*Math.PI/180);
        }else{c.root.position.set(members[i].x,0,members[i].z);updateDoll(c,elapsed,camera);}
      });
      renderer.render(scene,camera);draws++;
      canvas.dataset.ready='true';canvas.dataset.scene=mode;canvas.dataset.member=selected;canvas.dataset.members='5';canvas.dataset.avatar='original-town-dolls';canvas.dataset.frames=String(draws);canvas.dataset.part=String(stageFrame?.part??0);canvas.dataset.center=stageFrame?.memberId||'';
      notice.hidden=true;
    }
    raf=requestAnimationFrame(render);
  }
  const visibility=()=>{last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else if(!raf&&!disposed&&!lost)raf=requestAnimationFrame(render);};document.addEventListener('visibilitychange',visibility);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(raf);canvas.dataset.ready='error';notice.hidden=false;notice.textContent='입체 화면 연결이 끊어졌어요. 게임 진행은 저장돼요. 새로고침해서 다시 열 수 있어요.';});
  function dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',preference);
    const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){materials.add(o.material);if(o.material.map)textures.add(o.material.map);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();
  }
  window.addEventListener('pagehide',e=>{if(!e.persisted)dispose();});
  raf=requestAnimationFrame(render);
}
