/* global window, document, localStorage */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {GAMES,SIGNATURES} from '../../src/arcade-room/catalog.js';
import {VOICES} from '../../src/arcade-room/voices.js';
import {emptyProgress,snapshotRound,stageGoal,PROGRESS_KEY} from '../../src/arcade-room/progress.js';

async function readyToClear(page,kind){
  const state=createGame(kind,{stage:1,seed:7}),progress=emptyProgress();
  state[{drive:'hits',blocks:'popped',photo:'collected',rhythm:'hits',catch:'defeated'}[kind]]=stageGoal(kind,1).target;
  progress.games[kind].snapshot=snapshotRound(state);
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:PROGRESS_KEY,value:JSON.stringify(progress)});
  await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
  await page.goto('./');await expect(page.locator(`[data-start="${kind}"].start`)).toBeEnabled();
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await page.locator(`[data-start="${kind}"].start`).click();
}

for(const [kind,game] of Object.entries(GAMES))test(`${game.member}: real recording decodes, clears, replays and stops`,async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const NativeAudio=window.Audio;window.voiceElements=[];
    window.Audio=function(src){const clip=new NativeAudio(src);window.voiceElements.push(clip);return clip;};
  });
  await readyToClear(page,kind);await page.getByRole('button',{name:'계속하기 ▶'}).click();
  await page.clock.runFor(50);
  await expect(page.locator('#app')).toHaveAttribute('data-cleared','true');
  await expect(page.locator('.result-message')).toHaveText(SIGNATURES[game.member].line);
  await expect(page.locator('.member-voice')).toContainText(VOICES[game.member].spoken);
  await expect(page.locator('.member-voice a')).toHaveAttribute('href',VOICES[game.member].source);
  // Actual native media element, bundled MP3 and browser decoder (not a playback stub).
  await expect.poll(()=>page.evaluate(()=>window.voiceElements.at(-1).currentTime)).toBeGreaterThan(0);
  const clip=await page.evaluate(()=>{const a=window.voiceElements.at(-1);return {src:a.currentSrc,duration:a.duration,error:a.error?.code};});
  expect(clip.src).toContain(`/voices/${game.member}.mp3`);expect(clip.duration).toBeGreaterThan(1);expect(clip.duration).toBeLessThan(4);expect(clip.error).toBeUndefined();
  // A playing clock also advances for silent MP3s. Verify the decoded signal itself.
  const signal=await page.evaluate(async path=>{
    const context=new (window.AudioContext||window.webkitAudioContext)();
    try{const response=await window.fetch(path),buffer=await context.decodeAudioData(await response.arrayBuffer());const samples=buffer.getChannelData(0);let peak=0,power=0,active=0;for(const sample of samples){peak=Math.max(peak,Math.abs(sample));power+=sample*sample;if(Math.abs(sample)>.001)active++;}return {peak,rms:Math.sqrt(power/samples.length),active:active/samples.length};}finally{await context.close();}
  },VOICES[game.member].file);
  expect(signal.peak,'MP3 must contain audible samples').toBeGreaterThan(.01);expect(signal.rms,'silent audio regression').toBeGreaterThan(.001);expect(signal.active).toBeGreaterThan(.1);

  await page.getByRole('button',{name:'음성 정지',exact:true}).click();
  expect(await page.evaluate(()=>window.voiceElements.at(-1).paused)).toBe(true);
  await page.getByRole('button',{name:`▶ ${game.name} 실제 음성 듣기`,exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.voiceElements.at(-1).currentTime)).toBeGreaterThan(0);
  await page.screenshot({path:info.outputPath(`${game.member}-voice-clear.png`),fullPage:true});
  await page.getByRole('button',{name:'다음 스테이지 ▶'}).click();
  expect(await page.evaluate(()=>window.voiceElements.every(a=>a.paused))).toBe(true);expect(errors).toEqual([]);
});

test('default voice attempts playback; failed media keeps clear progress and retry usable',async({page})=>{
  await page.route('**/voices/*.mp3*',route=>route.abort());
  const requests=[];page.on('request',r=>{if(r.url().includes('/voices/'))requests.push(r.url());});
  await readyToClear(page,'blocks');await page.getByRole('button',{name:'계속하기 ▶'}).click();await page.clock.runFor(50);
  await expect.poll(()=>requests.length).toBeGreaterThan(0);await expect(page.locator('#voice-status')).toContainText('다시 듣기');await expect(page.getByRole('button',{name:'다음 스테이지 ▶'})).toBeEnabled();
  await page.getByRole('button',{name:'▶ 메이 실제 음성 듣기',exact:true}).click();
  await expect(page.locator('#voice-status')).toContainText('다시 듣기');
  await page.getByRole('button',{name:'다음 스테이지 ▶'}).click();await expect(page.locator('.stage-goal')).toContainText('STAGE 2');
});

test('backgrounding a result stops voice and source link stays in the keyboard focus loop',async({page})=>{
  await page.addInitScript(()=>{window.clips=[];window.Audio=class{constructor(){window.clips.push(this);}play(){return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}load(){}};});
  await readyToClear(page,'blocks');await page.getByRole('button',{name:'계속하기 ▶'}).click();await page.clock.runFor(50);
  await page.getByRole('button',{name:'▶ 메이 실제 음성 듣기',exact:true}).click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new window.Event('visibilitychange'));});
  expect(await page.evaluate(()=>window.clips.at(-1).paused)).toBe(true);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new window.Event('visibilitychange'));});
  await page.locator('.member-voice a').focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'다음 스테이지 ▶'})).toBeFocused();
});
