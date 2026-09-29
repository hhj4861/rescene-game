/* global console, document, window, HTMLCanvasElement, fetch */
import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { chromium, webkit } from '@playwright/test';
import { startServer } from '../../server/survival/server.mjs';

const dir=mkdtempSync(join(tmpdir(),'rescene-3d-'));
// No live model configuration. Preserve a pre-existing season across every interaction.
let calls=0;
const runtime={describe:()=>({defaultProvider:'litellm',litellm:{configured:false}}),run:()=>{calls++;throw new Error('3D prototype must not invoke an AI');}};
const {server,game}=startServer({port:0,dataDir:join(dir,'data'),runtime});
await once(server,'listening');game.create('3d-save-preservation','claude');
const saveBefore=readFileSync(game.store.path,'utf8');
const url=`http://127.0.0.1:${server.address().port}`;
const results=[];
try{
  for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await type.launch({headless:true});
    try{
      const page=await browser.newPage({viewport:{width:1512,height:982}}),errors=[],apiRequests=[],external=[],captureDiagnostics=[];
      let capturing=false;
      // Playwright WebKit unconditionally injects `body {}` to sync animations before
      // screenshots (inPagePrepareForScreenshots), even with caret:'initial'. Keep CSP
      // intact and separately record only that exact diagnostic during a capture.
      const capture=async(target,options={})=>{capturing=true;try{return await target.screenshot({...options,caret:'initial'});}finally{capturing=false;}};
      page.setDefaultTimeout(20000);
      console.log(`${name}: loading scene`);
      page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{
        if(m.type()!=='error')return;
        if(name==='webkit'&&capturing&&m.text()==="Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.")captureDiagnostics.push(m.text());
        else errors.push(m.text());
      });
      page.on('request',r=>{if(r.url().includes('/api/'))apiRequests.push(r.url());if(!r.url().startsWith(url)&&!r.url().startsWith('blob:'+url+'/'))external.push(r.url());});
      const response=await page.goto(`${url}/survival-3d-preview.html`);
      assert.equal(response.status(),200);assert.match(response.headers()['content-security-policy'],/script-src 'self'/);
      await page.waitForFunction(()=>document.querySelector('canvas').dataset.ready==='true');
      await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.frames)>=30);
      const render=await page.locator('canvas').evaluate(el=>({...el.dataset}));
      assert.ok(Number(render.triangles)>50000);assert.ok(Number(render.draws)<350);
      await page.getByRole('button',{name:'동작 멈추기'}).click();
      await capture(page,{path:join(dir,`${name}-desktop.png`)});
      assert.equal(render.avatar,'original-town-dolls');assert.equal(render.members,'5');
      assert.equal(render.poses,'0,0,0,0,0');
      const dolls=await page.evaluate(async()=>{
        const T=await import('/vendor/three/three.module.js');
        const {loadDollArt,createDoll,updateDoll}=await import('/src/survival/three/dolls.js');
        const {batchStatic}=await import('/src/survival/three/primitives.js');
        const art=await loadDollArt(),root=new T.Group(),camera=new T.PerspectiveCamera();camera.position.set(0,2,6);
        return art.map((frames,index)=>{
          const doll=createDoll(root,{x:0,z:0},index,frames);batchStatic(root);updateDoll(doll,0,camera);
          const rest=doll.pose;doll.greetingAt=0;updateDoll(doll,1.1,camera);const greeting=doll.pose;
          const retained=doll.frames.every(mesh=>mesh.parent===doll.pivot);
          updateDoll(doll,4,camera);const returned=doll.pose;
          const frame=frames[0];let clear=0,solid=0,green=0;
          for(let i=0;i<frame.pixels.length;i+=4){const p=frame.pixels;if(p[i+3]===0)clear++;if(p[i+3]>220){solid++;if(p[i+1]-Math.max(p[i],p[i+2])>100)green++;}}
          // A ray through a fully transparent margin must not select the card.
          root.updateMatrixWorld(true);const mesh=doll.frames[0],width=frame.width*.0056,height=frame.height*.0056;
          const corner=mesh.localToWorld(new T.Vector3(-width/2+.001,height/2-.001,0));
          const ray=new T.Raycaster(corner.clone().add(new T.Vector3(0,0,2)),new T.Vector3(0,0,-1));
          const emptyHits=ray.intersectObject(mesh).length;
          return {index,rest,greeting,returned,retained,clear,solid,green,emptyHits,width:frame.width,height:frame.height};
        });
      });
      assert.equal(dolls.length,5);
      for(const doll of dolls){assert.equal(doll.rest,0);assert.equal(doll.greeting,1);assert.equal(doll.returned,0);assert.equal(doll.retained,true);assert.ok(doll.clear>1000);assert.ok(doll.solid>10000);assert.equal(doll.green,0);assert.equal(doll.emptyHits,0);}
      await page.getByRole('button',{name:'원이',exact:true}).click();
      await capture(page,{path:join(dir,`${name}-avatar-desktop.png`)});
      await page.getByRole('button',{name:'카메라 시점 초기화'}).click();

      console.log(`${name}: rendered, testing camera`);
      const initialCamera=await page.locator('canvas').getAttribute('data-camera');
      await page.getByRole('button',{name:'공간 둘러보기',exact:true}).click();
      await page.waitForFunction(before=>document.querySelector('canvas').dataset.camera!==before,initialCamera);
      const roomCamera=await page.locator('canvas').getAttribute('data-camera');
      await page.locator('canvas').focus();await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(before=>document.querySelector('canvas').dataset.camera!==before,roomCamera);
      const beforeDrag=await page.locator('canvas').getAttribute('data-camera');
      const bounds=await page.locator('canvas').boundingBox();
      await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.6);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.65,bounds.y+bounds.height*.65,{steps:8});await page.mouse.up();
      await page.waitForFunction(before=>document.querySelector('canvas').dataset.camera!==before,beforeDrag);
      await page.getByRole('button',{name:'제나',exact:true}).click();
      await page.getByRole('button',{name:'카메라 시점 초기화'}).click();
      await page.waitForFunction(()=>document.querySelector('canvas').dataset.camera?.startsWith('0.000,2.631,5.298'));
      // A direct hit on Woni's rendered head proves mesh picking after batching and alpha-aware picking.
      await page.locator('canvas').click({position:{x:bounds.width*.30,y:bounds.height*.40}});
      assert.equal(await page.locator('.stage').getAttribute('data-member'),'woni');
      console.log(`${name}: mesh picking passed, testing greetings`);
      for(const [i,member] of ['원이','리브','미나미','메이','제나'].entries()){
        await page.getByRole('button',{name:member,exact:true}).click();
        assert.equal(await page.locator('#speaker').innerText(),member);
        await page.getByRole('button',{name:'반갑게 인사하기'}).click();
        assert.equal(await page.locator('#greet-count').innerText(),`${i+1} / 5`);
      }
      await page.getByRole('button',{name:'함께 둘러보기'}).click();
      assert.match(await page.locator('#line').innerText(),/우리만의 계절/);
      await page.getByRole('button',{name:'동작 재생하기'}).click();
      await page.waitForFunction(()=>document.querySelector('canvas').dataset.poses==='1,1,1,1,1');
      const previousFrames=Number(await page.locator('canvas').getAttribute('data-frames'));
      await page.waitForFunction(before=>Number(document.querySelector('canvas').dataset.frames)>before,previousFrames);
      await page.getByRole('button',{name:'동작 멈추기'}).click();
      await page.waitForTimeout(100);
      const still1=await capture(page.locator('canvas'));await page.waitForTimeout(400);const still2=await capture(page.locator('canvas'));
      assert.deepEqual(still1,still2,'Pause must stop visible motion');
      console.log(`${name}: greetings and pause passed`);
      await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'카메라 시점 초기화'}).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
      await capture(page,{path:join(dir,`${name}-mobile.png`),fullPage:true});
      await page.locator('[data-member="0"]').click();
      assert.equal(await page.locator('.stage').getAttribute('data-view'),'member');
      await capture(page,{path:join(dir,`${name}-member.png`),fullPage:true});
      assert.deepEqual(apiRequests,[]);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
      assert.equal(captureDiagnostics.length,name==='webkit'?6:0);
      // Reduced motion takes effect on first load, with keyboard-accessible greeting controls.
      const reduced=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844},hasTouch:true});
      reduced.setDefaultTimeout(20000);
      await reduced.goto(`${url}/survival-3d-preview.html`);await reduced.waitForFunction(()=>document.querySelector('canvas').dataset.ready==='true');
      assert.equal(await reduced.locator('#motion').getAttribute('aria-pressed'),'true');
      await reduced.locator('[data-member="1"]').tap();assert.equal(await reduced.locator('#speaker').innerText(),'리브');
      await reduced.locator('[data-member="2"]').focus();await reduced.keyboard.press('Enter');
      assert.equal(await reduced.locator('#speaker').innerText(),'미나미');await reduced.close();
      if(name==='chromium'){
        await page.bringToFront();
        await page.locator('canvas').evaluate(el=>el.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
        await page.waitForFunction(()=>document.querySelector('canvas').dataset.ready==='error');
        assert.match(await page.locator('#load-state').innerText(),/연결이 끊어졌어요/);
      }
      // An unavailable GPU is recoverable and never presented as a blank screen.
      const unavailable=await browser.newPage();
      unavailable.setDefaultTimeout(20000);
      await unavailable.addInitScript(()=>{
        const original=HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.startsWith('webgl'))return null;return original.call(this,type,...args);};
      });
      const missing=await browser.newPage();
      await missing.route('**/rescene-motion-v2.webp',route=>route.fulfill({status:404,body:'not found'}));
      await missing.goto(`${url}/survival-3d-preview.html`);await missing.waitForFunction(()=>document.querySelector('canvas').dataset.ready==='error');
      assert.match(await missing.locator('#load-state').innerText(),/캐릭터 이미지/);assert.equal(await missing.locator('#greet').isDisabled(),true);await missing.close();
      await unavailable.goto(`${url}/survival-3d-preview.html`);await unavailable.waitForFunction(()=>document.querySelector('canvas').dataset.ready==='error');
      assert.equal(await unavailable.getByRole('button',{name:'다시 열기'}).isVisible(),true);
      assert.equal(await unavailable.locator('#greet').isDisabled(),true);await unavailable.close();
      results.push({browser:name,render,dolls,applicationErrors:errors,captureDiagnostics,checks:['five-original-dolls','alpha-aware-picking','chroma-key-preserves-art','greeting-pose-and-return','animated-card-preservation','missing-art-error','real-webgl','five-greetings','mesh-picking','camera-presets','drag','keyboard','pause','mobile','touch-selection','reduced-motion','webgl-fallback',...(name==='chromium'?['context-loss']:[]),'no-network-model-call']});
    }finally{await browser.close();}
  }
  for(const path of ['/survival.html','/survival-3d-preview.html'])assert.ok(!(await fetch(url+path)).headers.get('content-security-policy').includes('blob:'));
  assert.deepEqual(Buffer.from(await (await fetch(url+'/assets/dolls/rescene-motion-v2.webp')).arrayBuffer()),readFileSync('public/assets/dolls/rescene-motion-v2.webp'));
  for(const path of ['/vendor/vrm/avatar-loader.js','/assets/survival-3d/characters/woni-base.vrm'])assert.equal((await fetch(url+path)).status,404);
  assert.equal(calls,0);assert.equal(readFileSync(game.store.path,'utf8'),saveBefore);
  for(const path of ['/vendor/three/package.json','/src/survival/three/not-allowed.js'])assert.equal((await fetch(url+path)).status,404);
  writeFileSync(join(dir,'results.json'),JSON.stringify({passed:true,dir,results,savePreserved:true},null,2));
  console.log(JSON.stringify({passed:true,dir,results,savePreserved:true}));
}finally{server.close();await once(server,'close');}
