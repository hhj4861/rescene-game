import {expect} from '@playwright/test';
export async function waitPump(page){if(await page.locator('#app').getAttribute('data-game')==='rhythm'&&await page.locator('#app').getAttribute('data-state')==='playing')await expect(page.locator('#music-status')).toContainText(/재생 중|꺼져/);}
export async function enterPump(page){if(await page.locator('#app').getAttribute('data-state')!=='songs')return;const resume=page.locator('[data-song-resume]');if(await resume.count())await resume.click();else await page.locator('[data-song-start]').click();await waitPump(page);}
