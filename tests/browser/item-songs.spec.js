/* global window, localStorage */
import {test,expect} from '@playwright/test';
import {createGame,availableSwap,matches} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
import {SCORE_SONGS} from '../../src/arcade-room/voices.js';
const members={drive:'woni',blocks:'may',photo:'zena'};
async function open(page,kind){
 const s=createGame(kind,{seed:7});let pair;
 if(kind==='drive'){s.spawn=10;s.objects=[{id:0,lane:1,y:455,kind:'song'}];}
 if(kind==='blocks'){s.spawn=10;s.enemies=[];s.items=[{x:90,y:514,kind:'honey',ttl:12}];}
 if(kind==='photo'){pair=availableSwap(s.board);const board=[...s.board];[board[pair[0]],board[pair[1]]]=[board[pair[1]],board[pair[0]]];const i=matches(board)[0],source=i===pair[0]?pair[1]:i===pair[1]?pair[0]:i;s.board[source]+=10;}
 const p=emptyProgress();p.games[kind].snapshot=snapshotRound(s);
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);const Native=window.Audio;window.itemClips=[];window.Audio=class extends Native{constructor(src){super(src);window.itemClips.push({src,audio:this});}};},{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator(`[data-start="${kind}"].start`).click();await page.locator('[data-resume]').click();return pair;
}
async function collect(page,kind,pair){if(kind==='photo'){for(const i of pair)await page.locator(`.field-controls [data-act="${i}"]`).click();await page.locator('[data-act="song-pickup"]').click();}if(['drive','blocks'].includes(kind))await page.clock.runFor(50);}
for(const [kind,member] of Object.entries(members)){
 test(`${member} music item plays the bundled singing clip for its configured duration and pauses without replaying after reload`,async({page},info)=>{
  const pair=await open(page,kind);await page.screenshot({path:info.outputPath('song-item.png')});await collect(page,kind,pair);await expect.poll(()=>page.evaluate(()=>window.itemClips.find(c=>c.src.includes('-song.mp3'))?.audio.currentTime||0)).toBeGreaterThan(0);expect(await page.evaluate(()=>window.itemClips.filter(c=>c.src.includes('-song.mp3')).map(c=>c.src))).toEqual([SCORE_SONGS[member].file]);await expect(page.locator('#voice-preview-status')).toContainText(SCORE_SONGS[member].title);
  await page.locator('[data-pause]').click();expect(await page.evaluate(()=>window.itemClips.every(c=>c.audio.paused))).toBe(true);await page.reload();await page.locator(`[data-start="${kind}"].start`).click();await page.locator('[data-resume]').click();await page.clock.runFor(100);expect(await page.evaluate(()=>window.itemClips.filter(c=>c.src.includes('-song.mp3')).length)).toBe(0);
 });
 for(const toggle of ['voice','sound'])test(`${member} music item respects ${toggle} mute`,async({page})=>{const pair=await open(page,kind);await page.locator(`[data-${toggle}]`).click();await collect(page,kind,pair);expect(await page.evaluate(()=>window.itemClips.filter(c=>c.src.includes('-song.mp3')).length)).toBe(0);});
}
