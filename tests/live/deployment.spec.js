/* global process, URL */
import {test,expect} from '@playwright/test';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

test('public HTML, game code, styles and cast match the verified build',async({page,baseURL},testInfo)=>{
  const output=process.env.ARCADE_BUILD_OUTPUT;
  if(!output)throw new Error('Set ARCADE_BUILD_OUTPUT to the expected static build.');
  const files=['index.html','town-cast.webp',...(await readdir(join(output,'assets'))).map(name=>`assets/${name}`)];
  const expected=new Map(await Promise.all(files.map(async name=>[new URL(name==='index.html'?'':name,baseURL).href,{name,body:await readFile(join(output,name))}])));
  const pending=[],seen=new Set();
  const hash=data=>createHash('sha256').update(data).digest('hex');
  page.on('response',response=>{
    const file=expected.get(response.url());if(!file)return;
    // Resolve failures as values so they cannot become unhandled rejections.
    pending.push((async()=>{
      expect(response.status()).toBe(200);
      const actual=hash(await response.body());expect(actual,file.name).toBe(hash(file.body));
      seen.add(file.name);return {file:file.name,sha256:actual};
    })().catch(error=>({error})));
  });
  await page.goto('./');
  await expect(page.locator('[data-start]:enabled')).toHaveCount(5);
  const results=await Promise.all(pending);
  for(const result of results)if(result.error)throw result.error;
  expect([...seen].sort()).toEqual([...files].sort());
  await testInfo.attach('public-asset-hashes',{body:JSON.stringify(results,null,2),contentType:'application/json'});
});
