/* global console, document, window, btoa */
import assert from 'node:assert/strict';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { startServer } from '../../server/survival/server.mjs';

// This offline asset workbench is only intercepted by Playwright. Exporter/loader
// tooling is not exposed by the game's HTTP allowlist or shipped to players.
const output=resolve('public/assets/survival-3d/characters');
const proof=resolve('docs/design/3d-character-motion');
const bundle=await build({stdin:{contents:"export {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js'; export {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';",resolveDir:process.cwd()},bundle:true,format:'esm',write:false,plugins:[{name:'shared-three',setup(b){b.onResolve({filter:/^three$/},()=>({path:'/vendor/three/three.module.js',external:true}));}}]});
const {server}=startServer({port:0,dataDir:mkdtempSync(join(tmpdir(),'rescene-models-'))});
await once(server,'listening');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1500,height:780}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/__model-tools.js',r=>r.fulfill({contentType:'text/javascript',body:bundle.outputFiles[0].text}));
  await page.route('**/__model-workbench.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ko"><title>RESCENE — rigged model source preview</title><body style="margin:0;background:#e9e5dc"><canvas></canvas></body></html>'}));
  await page.goto(`http://127.0.0.1:${server.address().port}/__model-workbench.html`);
  const result=await page.evaluate(async()=>{
    const T=await import('/vendor/three/three.module.js');
    const {GLTFExporter,GLTFLoader}=await import('/__model-tools.js');
    const {members,createMember,updateMember}=await import('/src/survival/three/characters.js');
    const {batchStatic}=await import('/src/survival/three/primitives.js');
    const exporter=new GLTFExporter(),loader=new GLTFLoader(),assets=[];
    const scene=new T.Scene();scene.background=new T.Color('#e9e5dc');
    scene.add(new T.HemisphereLight('#fff5df','#827c70',2));
    const sun=new T.DirectionalLight('#fff5e2',2.5);sun.position.set(-3,6,6);scene.add(sun);
    const camera=new T.PerspectiveCamera(29,1500/780,.1,100);camera.position.set(0,2.8,11);camera.lookAt(0,1.1,0);
    const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});renderer.setSize(1500,780);renderer.toneMapping=T.ACESFilmicToneMapping;
    for(const [index,member] of members.entries()){
      const parent=new T.Group(),c=createMember(parent,{...member,x:0,z:0,yaw:0},index);
      c.root.name=member.id;c.root.getObjectByName('seat').removeFromParent();
      c.upper.name=`${member.id}-upper`;c.head.name=`${member.id}-head`;
      c.eyes.forEach((o,i)=>{o.name=`${member.id}-eye-${i}`;});
      c.expression.forEach((o,i)=>{o.name=`${member.id}-expression-${i}`;});
      c.root.userData.assetStage='procedural-rigged-prototype';
      c.root.userData.designMatch='Not a final likeness or an approved production model';
      // Batch only static details; skin weights and facial morphs must survive.
      batchStatic(c.root).forEach(g=>g.dispose());
      const clips=[];
      for(const [name,duration,greetingAt] of [['idle',4.9,null],['greeting',3.2,0]]){
        c.greetingAt=greetingAt;
        const targets=[[c.upper,'position'],[c.head,'quaternion'],...c.eyes.map(e=>[e,'scale']),...c.arms.flatMap(a=>[[a.shoulder,'quaternion'],[a.elbow,'quaternion'],[a.wrist,'quaternion']]),...c.expression.map(e=>[e,'morphTargetInfluences'])];
        const frames=Math.ceil(duration*30),times=[],values=targets.map(()=>[]);
        for(let f=0;f<=frames;f++){
          const time=f/frames*duration;times.push(time);updateMember(c,time,0);
          targets.forEach(([object,property],i)=>values[i].push(...(property==='morphTargetInfluences'?object[property]:object[property].toArray())));
        }
        // Close the idle loop smoothly; a greeting is intended to play once.
        if(name==='idle')targets.forEach(([,property],i)=>{
          const width=values[i].length/times.length;
          for(let f=frames-10;f<=frames;f++){
            const t=(f-(frames-10))/10,blend=t*t*(3-2*t);
            if(property==='quaternion')new T.Quaternion().fromArray(values[i],f*width).slerp(new T.Quaternion().fromArray(values[i]),blend).toArray(values[i],f*width);
            else for(let k=0;k<width;k++)values[i][f*width+k]=T.MathUtils.lerp(values[i][f*width+k],values[i][k],blend);
          }
        });
        const tracks=targets.map(([object,property],i)=>new (property==='quaternion'?T.QuaternionKeyframeTrack:property==='morphTargetInfluences'?T.NumberKeyframeTrack:T.VectorKeyframeTrack)(`${object.uuid}.${property}`,times,values[i]));
        clips.push(new T.AnimationClip(name,duration,tracks));
      }
      c.greetingAt=null;updateMember(c,0,0);c.root.updateWorldMatrix(true,true);
      const binary=await exporter.parseAsync(c.root,{binary:true,animations:clips,trs:true});
      if(!(binary instanceof ArrayBuffer))throw new Error('Expected embedded GLB');
      // Parse the actual exported bytes, then verify their runtime animation.
      const loaded=await loader.parseAsync(binary,'');
      const skins=[],morphs=[];loaded.scene.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);if(o.morphTargetInfluences?.length)morphs.push(o);});
      if(skins.length!==2||morphs.length!==3)throw new Error(`${member.id}: lost skin or face targets`);
      const clip=loaded.animations.find(a=>a.name==='greeting');
      if(!clip||!loaded.animations.find(a=>a.name==='idle'))throw new Error('Missing clips');
      const bone=skins[1].skeleton.bones[0];const before=bone.quaternion.clone();
      const mixer=new T.AnimationMixer(loaded.scene);mixer.clipAction(clip).play();mixer.setTime(1.1);loaded.scene.updateMatrixWorld(true);
      if(before.angleTo(bone.quaternion)<.2)throw new Error(`${member.id}: greeting bones did not animate`);
      if(!morphs.every(m=>m.morphTargetInfluences[0]>.8))throw new Error('Smile clip missing');
      const weights=skins[0].geometry.attributes.skinWeight;
      for(let i=0;i<weights.count;i++)if(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)>1e-5)throw new Error('Invalid skin weights');
      loaded.scene.position.x=(index-2)*1.35;scene.add(loaded.scene);
      const bytes=new Uint8Array(binary);let str='';for(let i=0;i<bytes.length;i+=32768)str+=String.fromCharCode(...bytes.subarray(i,i+32768));
      assets.push({id:member.id,name:member.name,bytes:bytes.length,skinMeshes:skins.length,morphMeshes:morphs.length,animations:loaded.animations.map(a=>a.name),base64:btoa(str)});
    }
    renderer.render(scene,camera);
    window.addEventListener('pagehide',()=>renderer.dispose());
    return assets;
  });
  assert.deepEqual(errors,[]);assert.equal(result.length,5);
  mkdirSync(output,{recursive:true});mkdirSync(proof,{recursive:true});
  const manifest={stage:'procedural-rigged-prototype',source:'Original procedural geometry in src/survival/three; no third-party character assets',limitations:'Seated prototype. Arms have skinning; head and facial parts use transform and morph animation. Not a full humanoid rig or a final match to the design reference.',command:'node tools/survival/build-character-models.mjs',models:[]};
  for(const {base64,...asset} of result){const bytes=Buffer.from(base64,'base64');writeFileSync(join(output,`${asset.id}.glb`),bytes);manifest.models.push({...asset,file:`${asset.id}.glb`,sha256:createHash('sha256').update(bytes).digest('hex'),roundTripVerified:true});}
  writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  await page.screenshot({path:join(proof,'greeting.png')});
  console.log(JSON.stringify({passed:true,output,models:manifest.models},null,2));
}finally{await browser.close();server.close();await once(server,'close');}
