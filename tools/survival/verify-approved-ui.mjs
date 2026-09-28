/* global process, document, innerWidth, console */
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { startServer } from '../../server/survival/server.mjs';
import { defaultPlan } from '../../server/survival/catalog.mjs';
const require=createRequire(resolve(process.env.SURVIVAL_DEPENDENCIES||'.','package.json'));
const {chromium,webkit}=require('@playwright/test');
const dir=mkdtempSync(join(tmpdir(),'rescene-approved-ui-'));
const calls=[];let game;
const runtime={async run(req){
  const p=JSON.parse(req.prompt),agentId=req.agentId;
  calls.push(req);
  let data={agentId,text:'시험 응답: 서로의 호흡을 듣고, 마지막까지 함께 맞춰 보자.'};
  if(['proposal','discussion'].includes(p.task))data={...data,plan:defaultPlan(),sourceRefs:[],memoryRefs:[]};
  if(p.task==='vote')data={...data,approve:true,planHash:p.planHash};
  if(p.task==='performance')data={...data,focus:'breath',intensity:1};
  if(p.task==='reflection')data={...data,eventRef:p.event.eventId,condition:'호흡',action:'휴식 시간을 확보하고 호흡을 다시 맞추기',structuredAction:{focus:'breath'},expectedEffect:{metric:'breath',direction:'down'}};
  if(p.task==='judge'){
    const opponent=game.state.rounds[game.state.round].pairs.find(v=>v.includes('team-0'))?.find(id=>id!=='team-0');
    data={...data,scores:p.evidence.map(e=>({teamId:e.teamId,evidenceHash:e.evidenceHash,criteria:Array(5).fill(e.teamId==='team-0'?17:game.state.round===3&&e.teamId===opponent?19:10),reason:'자동화 시험용 근거 평가'}))};
  }
  return {data,sessionId:agentId+'-fixture',provider:'fixture',usage:{input_tokens:100},durationMs:1};
}};
const started=startServer({port:0,dataDir:dir,runtime});game=started.game;const server=started.server;
await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1672,height:941}});
page.setDefaultTimeout(15000);
const errors=[],httpErrors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)httpErrors.push(r.url()+':'+r.status());});
const room=async id=>{
  if(await page.locator('#game-window').evaluate(e=>e.open))await page.getByRole('button',{name:'마을로 돌아가기'}).click();
  if(await page.locator('.stage-back').isVisible())await page.locator('.stage-back').click();
  await page.locator(`.place-menu [data-open="${id}"]`).click();
};
const capture=async name=>{await page.screenshot({path:join(dir,name+'.png'),fullPage:true});};
try{
  await page.goto(base);await page.locator('#begin-story').waitFor();
  await capture('01-arrival');
  assert.equal(calls.length,0);
  await page.locator('#begin-story').click();
  await page.getByRole('button',{name:'팀 회의실 들어가기'}).click();
  await page.getByText('Round 1 / 10',{exact:true}).waitFor();
  for(let round=1;round<=10;round++){
    await page.locator('[data-action="open"]').click();
    await page.locator('#discuss').waitFor();
    if(round===1){
      await page.locator('[data-practice="0"]').fill('8');
      assert.equal(await page.locator('#discuss').isDisabled(),true);
      await page.locator('[data-practice="0"]').fill('2');
      await page.locator('[data-recovery="0"]').fill('1');
      assert.equal(await page.locator('#discuss').isEnabled(),true);
      assert.equal(await page.locator('#schedule-cells .slot').count(),12);
      await page.locator('.plan-detail summary').click();
      await page.getByLabel('팀원들에게 하고 싶은 말').fill('휴식과 연습을 함께 배분해요.');
      await room('dorm');await page.keyboard.press('Escape');
      assert.equal(await page.getByLabel('팀원들에게 하고 싶은 말').inputValue(),'휴식과 연습을 함께 배분해요.');
      await page.locator('.plan-detail summary').click();
      await page.locator('#scene-sheet').evaluate(el=>el.scrollTop=0);
      assert.equal(await page.locator('#plan-panel h1').isVisible(),true);
      await capture('02-planning');
    }
    await page.locator('#discuss').click();
    await page.locator('#yes').click();
    await page.locator('[data-action="perform"]').click();
    await page.locator('[data-action="reflect"]').waitFor();
    if(round===1){
      assert.equal(game.state.rounds[1].plan.practice[0],3);
      assert.equal(game.state.rounds[1].plan.recovery[0],1);
      await page.reload();await page.locator('[data-action="reflect"]').waitFor();
      const count=calls.length;
      await room('stage');
      await page.locator('#replay').click();
      await page.waitForFunction(()=>Number(document.querySelector('#performance-seek').value)>1);
      await page.locator('#pause-performance').click();
      await page.locator('[data-seek="24"]').click();
      assert.equal(await page.locator('.concert').getAttribute('data-part'),'2');
      await capture('03-performance');
      const event=page.waitForEvent('download');await page.locator('#download-song').click();
      const dl=await event;await dl.saveAs(join(dir,'performance.wav'));
      assert.equal(readFileSync(join(dir,'performance.wav')).length,44+60*22050*4);
      assert.equal(calls.length,count);
      await room('journal');
    }
    await page.locator('[data-action="reflect"]').click();
    await page.locator('[data-action="next"]').waitFor();
    if(round===3){
      await page.getByRole('heading',{name:/패배.*진출/}).waitFor();
      await capture('04-reflection');
      await page.locator('#pin-reflection').click();
      await page.getByRole('button',{name:'팀의 기억에 남겼어요'}).waitFor();
      assert.equal(game.state.teamMemory.at(-1).round,3);
    }
    await page.locator('[data-action="next"]').click();
    if(round<10)await page.getByText(`Round ${round+1} / 10`,{exact:true}).waitFor();
  }
  await page.getByRole('heading',{name:'우리 여섯이 만든 계절'}).waitFor();
  assert.equal(game.state.champion,'team-0');
  await capture('05-finale');
  await page.locator('[data-open="details"]').first().click();
  await page.locator('#growth-woni summary').click();
  await page.getByRole('button',{name:'마을로 돌아가기'}).click();
  const id=game.state.id,before=calls.length;
  page.once('dialog',d=>d.dismiss());await page.locator('#finale-restart').click();
  assert.equal(game.state.id,id);assert.equal(calls.length,before);
  await page.setViewportSize({width:390,height:844});
  await capture('mobile-finale');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await room('schedule');await capture('mobile-planning');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await room('journal');await capture('mobile-reflection');
  await room('stage');await capture('mobile-performance');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  // WebKit layout and reduced-motion smoke against the same read-only completed fixture.
  const wb=await webkit.launch({headless:true});
  try{const wp=await wb.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});wp.on('pageerror',e=>errors.push(e.message));await wp.goto(base);await wp.locator('.finale-paper').waitFor();assert.equal(await wp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await wp.screenshot({path:join(dir,'webkit-mobile.png'),fullPage:true});}finally{await wb.close();}
  assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  writeFileSync(join(dir,'verification.json'),JSON.stringify({passed:true,mode:'explicit-fixture',rounds:10,calls:calls.length,errors,httpErrors,dir},null,2));
  console.log(JSON.stringify({passed:true,dir,calls:calls.length,rounds:10,mode:'explicit-fixture'}));
}catch(e){await capture('failure');console.error(JSON.stringify({dir,errors,httpErrors,phase:game.state?.phase}));throw e;}
finally{await browser.close();server.close();await once(server,'close');}
