/* global console, document, window, HTMLCanvasElement */
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {chromium} from '@playwright/test';
import {startServer} from '../../server/survival/server.mjs';
import {defaultPlan} from '../../server/survival/catalog.mjs';
const dir=mkdtempSync(join(tmpdir(),'rescene-playable-world-')),calls=[];
let failed=false;
const runtime={describe:()=>({defaultProvider:'litellm',litellm:{configured:true,model:'explicit-fixture'}}),async run(req){
  const p=JSON.parse(req.prompt),agentId=req.agentId;calls.push({task:p.task,agentId});
  if(p.task==='proposal'&&agentId==='woni'&&!failed){failed=true;throw new Error('시험용 일시 실패');}
  let data={agentId,text:`시험 ${agentId}: ${p.task}에서 서로 호흡을 맞추자.`};
  if(['proposal','discussion'].includes(p.task))data={...data,plan:defaultPlan(),sourceRefs:[],memoryRefs:[]};
  if(p.task==='vote')data={...data,approve:true,planHash:p.planHash};
  if(p.task==='performance')data={...data,focus:'breath',intensity:1};
  if(p.task==='reflection')data={...data,eventRef:p.event.eventId,condition:'호흡',action:'호흡을 맞추는 연습',structuredAction:{focus:'breath'},expectedEffect:{metric:'breath',direction:'down'}};
  if(p.task==='judge')data={...data,scores:p.evidence.map(e=>({teamId:e.teamId,evidenceHash:e.evidenceHash,criteria:Array(5).fill(e.teamId==='team-0'?19:10),reason:'시험용 평가'}))};
  return {data,provider:'fixture',sessionId:agentId+'-playable',usage:{input_tokens:100},durationMs:1};
}};
const {server,game}=startServer({port:0,dataDir:dir,runtime});await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],posts=[];
page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
const phase=async name=>page.locator(`.game-frame[data-phase="${name}"]`).waitFor();
try{
  await page.goto(base+'/survival-3d.html');await phase('arrival');
  await page.waitForFunction(()=>document.querySelector('.live-world canvas')?.dataset.ready==='true');
  await page.evaluate(()=>{window.testCanvas=document.querySelector('.live-world canvas');});
  await page.locator('#begin-story').click();await page.locator('#seed').fill('새 캐릭터 실제 진행 시험');
  // A null state poll must not clear the player's unsubmitted season name.
  await page.waitForResponse(r=>r.url().endsWith('/api/state'));
  assert.equal(await page.locator('#seed').inputValue(),'새 캐릭터 실제 진행 시험');
  assert.equal(game.state,null);assert.equal(calls.length,0);
  await page.locator('#start button').evaluate(button=>{button.click();button.click();});await phase('announced');
  assert.equal(posts.filter(p=>p.endsWith('/api/new')).length,1);assert.equal(game.state.seed,'새 캐릭터 실제 진행 시험');
  await page.locator('[data-action="open"]').click();await page.locator('.status.error').waitFor();
  assert.equal(game.state.phase,'proposal');assert.equal(calls.length,5);
  await page.locator('[data-action="open"]:enabled').click();await page.locator('#discuss').waitFor();
  assert.equal(calls.length,6,'Only the failed member should be retried');
  assert.equal(await page.evaluate(()=>window.testCanvas===document.querySelector('.live-world canvas')),true);
  // The rendered member selection reads that member's durable AI response.
  await page.locator('.live-world canvas').focus();await page.keyboard.press('5');
  assert.equal(await page.locator('#speaker-name').innerText(),'제나');assert.match(await page.locator('#speech-text').innerText(),/zena/);
  await page.locator('#discuss').click();await page.locator('#no').click();await phase('meeting');
  assert.equal(game.state.rounds[1].needsRediscussion,true);assert.equal(await page.locator('[data-action="perform"]').count(),0);
  await page.locator('#discuss').click();await page.locator('#yes').click();await phase('agreed');
  await page.locator('[data-action="perform"]').click();await phase('result');
  await page.locator('.place-menu [data-open="stage"]').click();
  await page.locator('[data-seek="24"]').click();
  await page.waitForFunction(()=>document.querySelector('.live-world canvas')?.dataset.part==='2');
  assert.equal(await page.evaluate(()=>window.testCanvas===document.querySelector('.live-world canvas')),true);
  assert.equal(await page.locator('.live-world canvas').getAttribute('data-center'),game.state.rounds[1].plan.leads[2]);
  await page.locator('.stage-back').click();await page.locator('[data-action="reflect"]').click();await phase('learned');
  const before=readFileSync(game.store.path,'utf8'),id=game.state.id,count=calls.length;
  await page.reload();await phase('learned');
  assert.equal(game.state.id,id);assert.equal(calls.length,count);assert.equal(readFileSync(game.store.path,'utf8'),before);
  await page.locator('[data-action="next"]').click();await phase('announced');assert.equal(game.state.round,2);
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.querySelector('.live-world canvas')?.dataset.ready==='true');
  await page.locator('[data-world="all"]').click();await page.locator('[data-world="motion"]').click();
  assert.equal(await page.locator('[data-world="motion"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.screenshot({path:join(dir,'mobile.png'),fullPage:true});
  // Losing GPU rendering must not remove the real game's progress controls.
  const fallback=await browser.newPage();
  await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:get.call(this,type,...args);};});
  await fallback.goto(base+'/survival-3d.html');await fallback.waitForFunction(()=>document.querySelector('.live-world canvas')?.dataset.ready==='error');
  assert.equal(await fallback.locator('[data-action="open"]').isEnabled(),true);assert.equal(game.state.id,id);assert.equal(calls.length,count);
  await fallback.close();assert.deepEqual(errors,[]);
  const result={passed:true,mode:'explicit-fixture',calls:calls.length,errors,checks:['playable-3d-entry','null-poll-keeps-draft','single-season-submit','failed-member-only-retry','one-webgl-context-across-phases','character-selection-reads-own-response','user-no-blocks-performance','rediscussion','audio-part-synchronization','reflection-save','reload-preserves-save','next-round','mobile-controls','gpu-failure-keeps-game-controls']};
  writeFileSync(join(dir,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,dir}));
}catch(error){await page.screenshot({path:join(dir,'failure.png'),fullPage:true});console.log(JSON.stringify({dir,phase:game.state?.phase,errors}));throw error;}
finally{await browser.close();server.close();await once(server,'close');}
