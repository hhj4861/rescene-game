/* global window */
import {test,expect} from '@playwright/test';

test('original BGM plays by default and stops on mute, pause, home and resume',async({page})=>{
 await page.addInitScript(()=>{
  const Native=window.AudioContext||window.webkitAudioContext;window.musicEvents=[];window.musicContexts=[];
  window.AudioContext=class extends Native{
   constructor(){super();this.audit=this.createAnalyser();this.audit.connect(this.destination);window.musicContexts.push(this);}
   createGain(){const g=super.createGain(),connect=g.connect.bind(g);g.connect=target=>connect(target===this.destination?this.audit:target);return g;}
   createOscillator(){const o=super.createOscillator(),start=o.start.bind(o),stop=o.stop.bind(o),record={stopped:false};
    o.start=at=>{record.at=at;record.frequency=o.frequency.value;window.musicEvents.push(record);start(at);};
    o.stop=at=>{if(at===undefined)record.stopped=true;stop(at);};return o;}
  };
 });
 await page.goto('./');await page.locator('[data-start="photo"].start').click();await page.waitForTimeout(500);
 await expect.poll(()=>page.evaluate(()=>window.musicEvents.length)).toBeGreaterThan(4);
 await expect.poll(()=>page.evaluate(()=>{const c=window.musicContexts[0],data=new Float32Array(c.audit.fftSize);c.audit.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);})).toBeGreaterThan(.0001);
 await expect(page.getByText(/오븐 앞 오후/)).toBeVisible();await page.getByRole('button',{name:'BGM 끄기',exact:true}).click();const count=await page.evaluate(()=>window.musicEvents.length);await page.waitForTimeout(350);expect(await page.evaluate(()=>window.musicEvents.length)).toBe(count);
 await page.getByRole('button',{name:'BGM 켜기',exact:true}).click();await page.waitForTimeout(500);expect(await page.evaluate(()=>window.musicEvents.length)).toBeGreaterThan(count);
 await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();const paused=await page.evaluate(()=>window.musicEvents.length);await page.waitForTimeout(350);expect(await page.evaluate(()=>window.musicEvents.length)).toBe(paused);await expect.poll(()=>page.evaluate(()=>window.musicEvents.some(n=>n.stopped))).toBe(true);
 await page.getByRole('button',{name:'계속하기 ▶'}).click();await page.waitForTimeout(500);expect(await page.evaluate(()=>window.musicEvents.length)).toBeGreaterThan(paused);
 await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();await page.getByRole('button',{name:'오락실로 돌아가기'}).click();const home=await page.evaluate(()=>window.musicEvents.length);await page.waitForTimeout(350);expect(await page.evaluate(()=>window.musicEvents.length)).toBe(home);
});

test('pump chart follows the 120 BPM score through pause and resume',async({page})=>{
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-start="rhythm"].start').click();await expect(page.getByText(/Five Steps, One Stage/)).toBeVisible();await page.clock.runFor(2000);await page.keyboard.press('z');await expect(page.locator('#goal')).toHaveText('1 / 16 박자');
 await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();await page.clock.runFor(5000);await page.getByRole('button',{name:'계속하기 ▶'}).click();
 for(const [i,key] of ['c','e','z'].entries()){await page.clock.runFor(1000);await page.keyboard.press(key);await expect(page.locator('#goal')).toHaveText(`${i+2} / 16 박자`);}
 await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 3개');
});
