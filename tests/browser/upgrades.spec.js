import {fakeApi} from './youtube-helpers.js';
import {enterPump,waitPump} from './pump-helpers.js';
/* global localStorage, window */
import {test,expect} from '@playwright/test';
import {createGame,gameAction,availableSwap} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,stageGoal,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,s){
 if(s.kind==='catch')await fakeApi(page);
 const p=emptyProgress();p.games[s.kind]={stage:s.stage,highest:s.stage,hearts:s.hearts,snapshot:snapshotRound(s)};
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.locator(`[data-start="${s.kind}"].start`).click();await enterPump(page);await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-resume]').click();await waitPump(page);
}
test('one Liv breach with three overlapping enemies costs one life',async({page})=>{
 const s=createGame('catch',{seed:7});s.spawn=10;s.gates=[];s.enemies=[0,1,2].map(id=>({id,lane:0,y:479,hp:50,maxHp:50,boss:false}));await open(page,s);await page.clock.runFor(150);
 await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 2개');await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
});
test('May overlapping enemies cause one hit and timeout does not charge that hit again',async({page})=>{
 const s=createGame('blocks',{seed:7});s.elapsed=59.95;s.remaining=.05;s.invincible=0;s.enemies=[0,1,2].map(()=>({x:90,y:536,home:0,dir:1,trapped:0}));await open(page,s);await page.clock.runFor(100);
 await expect(page.locator('.result-lives')).toContainText('♥♥♡');expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.blocks.hearts,PROGRESS_KEY)).toBe(2);
});
async function saved(page,kind){await page.locator('[data-pause]').click();const s=await page.evaluate(({key,kind})=>JSON.parse(localStorage.getItem(key)).games[kind].snapshot,{key:PROGRESS_KEY,kind});await page.locator('[data-resume]').click();await waitPump(page);return s;}
async function voiceSpy(page){await page.addInitScript(()=>{window.voiceFiles=[];window.itemClips=[];const Native=window.Audio;window.Audio=class extends Native{constructor(src){super(src);window.voiceFiles.push(src);window.itemClips.push(this);}};});}
test('May collects both boosts, uses physical F in a Korean layout and reloads without replaying voice',async({page},info)=>{
 await voiceSpy(page);const s=createGame('blocks',{seed:7});s.enemies=[];s.spawn=10;s.items=[{x:90,y:514,kind:'speed',ttl:12},{x:125,y:514,kind:'size',ttl:12}];await open(page,s);await page.clock.runFor(50);await expect(page.locator('#powerup-status')).toContainText('속도 1.5배');await expect(page.locator('#powerup-status')).toContainText('큰 방울');expect(await page.evaluate(()=>window.voiceFiles)).toEqual([]);
 await page.locator('#game').dispatchEvent('keydown',{key:'ㄹ',code:'KeyF',bubbles:true});expect((await saved(page,'blocks')).bubbles[0].radius).toBe(34);expect(await page.evaluate(()=>window.voiceFiles.length)).toBe(0);
 await page.keyboard.down('ArrowRight');await page.clock.runFor(500);await page.keyboard.up('ArrowRight');const before=await saved(page,'blocks');expect(before.player.x).toBeGreaterThan(225);await page.screenshot({path:info.outputPath('may-powerups.png'),fullPage:true});
 await page.reload();await page.locator('[data-start="blocks"].start').click();await expect(page.locator('#powerup-status')).toContainText('큰 방울');expect(await page.evaluate(()=>window.voiceFiles.length)).toBe(0);
});
test('Liv gates increase rate and volley, picks a themed item and saves its duration',async({page},info)=>{
 await voiceSpy(page);const s=createGame('catch',{seed:7});s.spawn=10;s.gates=[{y:479,options:Array(3).fill({op:'add',value:4})},{y:474,options:Array(3).fill({op:'multiply',value:2})}];s.pickups=[{lane:1,y:440,kind:'new-world'}];await open(page,s);await page.clock.runFor(200);await expect(page.locator('#powerup-status')).toContainText('연사 1단계 · 한 번에 2발');await expect(page.locator('#powerup-status')).toContainText('New World');await expect(page.locator('#music-status')).toContainText('재생 중 · New World');let current=await saved(page,'catch');expect(current.shots.some(b=>b.x===95)).toBe(true);expect(current.itemTime).toBeGreaterThan(9);expect(await page.evaluate(()=>window.voiceFiles.length)).toBe(0);
 await page.screenshot({path:info.outputPath('liv-items.png'),fullPage:true});await page.reload();await page.locator('[data-start="catch"].start').click();await expect(page.locator('#powerup-status')).toContainText('New World');
});
test('Liv boss remains after the kill target and keyboard support can finish the boss',async({page},info)=>{
 const s=createGame('catch',{seed:7});s.defeated=6;s.charge=5;s.bossSpawned=true;s.enemies=[{id:0,lane:1,y:190,hp:10,maxHp:32,boss:true}];s.gates=[];s.spawn=10;await open(page,s);await page.clock.runFor(50);await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await expect(page.locator('#powerup-status')).toContainText('보스를 물리쳐요');await page.screenshot({path:info.outputPath('liv-boss.png'),fullPage:true});await page.keyboard.press('Space');await page.clock.runFor(50);await expect(page.locator('#result-title')).toHaveText('스테이지 1 클리어!');
});
test('Zena diagonal dragging previews the bread then swaps once',async({page},info)=>{
 const s=createGame('photo',{seed:7});await open(page,s);const {availableSwap}=await import('../../src/arcade-room/model.js'),pair=availableSwap(s.board),a=await page.locator('.field-controls button').nth(pair[0]).boundingBox(),horizontal=pair[1]-pair[0]===1;
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+a.width/2+a.width*(horizontal?.55:.48),a.y+a.height/2+a.height*(horizontal?.48:.55),{steps:5});await expect(page.locator('#extra')).toHaveText('17');await page.screenshot({path:info.outputPath('zena-drag-committed.png'),fullPage:true});await page.mouse.up();await expect(page.locator('#extra')).toHaveText('17');await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','swap');await page.clock.runFor(450);await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','fall');
});
test('Zena keyboard selects bread, uses rolling pin, falls and cannot reuse an empty item',async({page},info)=>{
 const s=createGame('photo',{seed:7});await open(page,s);await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.locator('.field-controls button').nth(7).dispatchEvent('keydown',{key:'ㄱ',code:'KeyR',bubbles:true});await expect(page.locator('.item-button')).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Enter');await expect(page.locator('#extra')).toHaveText('18');await expect(page.locator('.item-button')).toBeDisabled();await page.clock.runFor(270);await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','fall');await page.screenshot({path:info.outputPath('zena-rolling-pin.png'),fullPage:true});await page.clock.runFor(2000);const savedState=await saved(page,'photo');expect(savedState.rollingPins).toBe(0);expect(savedState.collected).toBeGreaterThanOrEqual(6);await page.keyboard.press('r');await expect(page.locator('.item-button')).toHaveAttribute('aria-pressed','false');
});
test('all five pump physical keys work even with Korean characters',async({page})=>{
 const s=createGame('rhythm',{seed:7,stage:3});await open(page,s);for(const [code,key,lane] of [['KeyZ','ㅋ',0],['KeyQ','ㅂ',1],['KeyS','ㄴ',2],['KeyE','ㄷ',3],['KeyC','ㅊ',4]]){await page.locator('#game').dispatchEvent('keydown',{code,key,bubbles:true});expect((await saved(page,'rhythm')).lastTaps[lane]).toBe(0);}
});
test('Liv item songs follow BGM instead of the member voice switch',async({page})=>{
 await voiceSpy(page);const s=createGame('catch',{seed:7});s.spawn=10;s.gates=[];s.pickups=[{lane:1,y:400,kind:'pinball'}];await open(page,s);await page.getByRole('button',{name:'멤버 음성 끄기',exact:true}).click();await page.clock.runFor(450);await expect(page.locator('#powerup-status')).toContainText('Pinball');await expect(page.locator('#music-status')).toContainText('재생 중 · Pinball');expect(await page.evaluate(()=>window.voiceFiles.length)).toBe(0);await page.locator('[data-music]').click();expect(await page.evaluate(()=>window.ytPlayers.at(-1).muted)).toBe(true);
});
test('Woni late-stage fake and real targets both remain keyboard operable',async({page},info)=>{
 const s=createGame('drive',{stage:15,seed:7});s.spawn=10;s.hits=3;s.score=500;s.holes[0]={ttl:1.6,total:1.6,gold:false,fake:true,flash:0};s.holes[3]={ttl:1.6,total:1.6,gold:false,fake:false,flash:0};await open(page,s);await page.screenshot({path:info.outputPath('woni-late-fake.png'),fullPage:true});await page.keyboard.press('1');await expect(page.locator('#score')).toHaveText('350');await page.keyboard.press('4');await expect(page.locator('#score')).toHaveText('460');await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 3개');
});

test('Woni gold rewards keep scores without ordinary member speech',async({page})=>{
 await voiceSpy(page);const s=createGame('drive',{seed:7});s.spawn=10;for(const i of [0,3,6])s.holes[i]={ttl:4,total:4,gold:true,fake:false,flash:0};await open(page,s);
 await page.keyboard.press('1');await page.keyboard.press('4');await expect(page.locator('#score')).toHaveText('430');
 await page.locator('[data-pause]').click();expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.drive.snapshot.itemPickups,PROGRESS_KEY)).toBe(2);await page.clock.runFor(4100);await page.locator('[data-resume]').click();await page.keyboard.press('7');await expect(page.locator('#score')).toHaveText('660');expect(await page.evaluate(()=>window.voiceFiles)).toEqual([]);
});
test('Woni final gold plays only the clear clip and manual replay stays available',async({page})=>{
 await voiceSpy(page);const s=createGame('drive',{seed:7});s.hits=stageGoal('drive',1).target-1;s.spawn=10;s.holes[0]={ttl:4,total:4,gold:true,fake:false,flash:0};await open(page,s);await page.keyboard.press('1');await expect(page.locator('#result-title')).toHaveText('스테이지 1 클리어!');expect(await page.evaluate(()=>window.voiceFiles.length)).toBe(1);await expect.poll(()=>page.evaluate(()=>window.itemClips.at(-1)?.currentTime||0)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'▶ 원이 실제 음성 듣기',exact:true}).click();expect(await page.evaluate(()=>window.voiceFiles.length)).toBe(2);await expect.poll(()=>page.evaluate(()=>window.itemClips.at(-1)?.currentTime||0)).toBeGreaterThan(0);
});
test('Zena earns a rolling pin by a normal keyboard match with one restored reaction',async({page})=>{
 await voiceSpy(page);let s,pair;for(let seed=1;seed<100;seed++){const candidate=createGame('photo',{stage:5,seed}),probe=createGame('photo',{stage:5,seed});const match=availableSwap(probe.board);gameAction(probe,{from:match[0],to:match[1]});if(probe.combo>1&&probe.collected<42){s=candidate;pair=match;break;}}expect(s).toBeTruthy();s.breadCharge=2;s.rollingPins=0;await open(page,s);
 for(let n=0;n<pair[0]%6;n++)await page.keyboard.press('ArrowRight');for(let n=0;n<Math.floor(pair[0]/6);n++)await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.keyboard.press(pair[1]-pair[0]===1?'ArrowRight':'ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#score')).not.toHaveText('0');expect(await page.evaluate(()=>window.voiceFiles)).toEqual(['./voices/zena-reaction-1.mp3']);await expect(page.locator('#powerup-status')).toContainText('밀대 1개');
});
