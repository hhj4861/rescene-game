/* global localStorage */
import {test,expect} from '@playwright/test';
import {fakeApi} from './youtube-helpers.js';
import {createGame,roundDuration} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,kind,{remaining=20,wait=0}={}){
 if(kind==='catch')await fakeApi(page);
 const s=createGame(kind,{seed:7});s.elapsed=roundDuration(kind)-remaining;s.remaining=remaining;s.songItemTime=wait;
 if(kind==='drive'){s.spawn=15;s.objects=[{id:0,lane:1,y:455,kind:'song'},{id:1,lane:0,y:200,kind:'song'}];}
 if(kind==='blocks'){s.spawn=15;s.enemies=[];s.items=[{x:90,y:514,kind:'honey',ttl:12},{x:400,y:100,kind:'honey',ttl:12}];}
 if(kind==='photo')s.songDrops=2;
 if(kind==='catch'){s.spawn=15;s.gates=[];s.enemies=[];s.pickups=[{lane:1,y:440,kind:'love-attack'},{lane:0,y:200,kind:'pinball'}];}
 const p=emptyProgress();p.games[kind].snapshot=snapshotRound(s);
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./?may=classic');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator(`[data-start="${kind}"].start`).click();await page.locator('[data-resume]').click();await page.locator('[data-sound]').click();
}
const saved=(page,kind)=>page.evaluate(({key,kind})=>JSON.parse(localStorage.getItem(key)).games[kind].snapshot,{key:PROGRESS_KEY,kind});
for(const kind of ['drive','blocks','photo','catch'])test(`${kind} muted song gift guarantees one minute, hides duplicates and preserves time across pause and reload`,async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page,kind);if(kind==='photo')await page.locator('[data-act="song-pickup"]').click();else await page.clock.runFor(50);await expect(page.locator('#time')).toContainText('60');await expect(page.locator('#powerup-status')).toContainText('다음 노래 아이템');if(kind==='photo')await expect(page.locator('[data-act="song-pickup"]')).toBeHidden();await page.screenshot({path:info.outputPath(kind+'-song-time.png')});await page.locator('[data-pause]').click();const first=await saved(page,kind);expect(first.songTimeBonus).toBeGreaterThanOrEqual(40);expect(first.songItemTime).toBeGreaterThan(19);if(kind==='drive')expect(first.objects.filter(o=>o.kind==='song')).toHaveLength(0);if(kind==='blocks')expect(first.items.filter(o=>o.kind==='honey')).toHaveLength(0);if(kind==='catch')expect(first.pickups).toHaveLength(0);if(kind==='photo')expect(first.songDrops).toBe(1);
 await page.clock.fastForward(65000);await page.reload();await page.locator(`[data-start="${kind}"].start`).click();await expect(page.locator('#time')).toContainText('60');const restored=await saved(page,kind);expect(restored.songTimeBonus).toBe(first.songTimeBonus);expect(restored.songItemTime).toBe(first.songItemTime);await page.locator('[data-resume]').click();await page.clock.runFor(1100);await expect(page.locator('#time')).toContainText('59');expect(errors).toEqual([]);
});
test('Zena hides the song button while waiting and exposes it again after the song window',async({page})=>{
 await open(page,'photo',{wait:.2});await expect(page.locator('[data-act="song-pickup"]')).toBeHidden();await page.clock.runFor(300);await expect(page.locator('[data-act="song-pickup"]')).toBeVisible();await page.locator('[data-act="song-pickup"]').click();await expect(page.locator('#time')).toContainText('60');await expect(page.locator('[data-act="song-pickup"]')).toBeHidden();
});
