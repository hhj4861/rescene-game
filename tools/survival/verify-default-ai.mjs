/* global process, console, Response, fetch, innerWidth, document */
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { startServer } from '../../server/survival/server.mjs';
import { LocalRuntime } from '../../server/survival/runtime.mjs';
import { defaultPlan } from '../../server/survival/catalog.mjs';
const require = createRequire(resolve(process.env.SURVIVAL_DEPENDENCIES || '.', 'package.json'));
const { chromium } = require('@playwright/test');
const dir = mkdtempSync(join(tmpdir(), 'rescene-default-ai-'));
const requests = []; let limited = false;
const offlineDir = join(dir, 'offline'), readyDir = join(dir, 'ready');
const offline = startServer({ port: 0, dataDir: offlineDir, runtime: new LocalRuntime(join(offlineDir, 'runtime'), { litellm: null }) });
const ready = startServer({ port: 0, dataDir: readyDir, runtime: new LocalRuntime(join(readyDir, 'runtime'), {
  litellm: { baseUrl: 'https://fixture.invalid/llm/v1', apiKey: 'test-only-key', model: 'test-only-gemini' },
  spawnImpl() { throw new Error('CLI must not run'); },
  // Explicit fixture at the network boundary: never sends a model request.
  async fetchImpl(_url, options) {
    const body = JSON.parse(options.body), p = JSON.parse(body.messages[1].content);
    requests.push(p.agentId);
    if (p.agentId === 'liv' && !limited) { limited = true; return new Response('secret upstream error', { status: 429 }); }
    return new Response(JSON.stringify({ model: body.model, choices: [{ finish_reason: 'stop', message: {
      content: JSON.stringify({ agentId: p.agentId, text: '검증용 멤버 제안', plan: defaultPlan(), sourceRefs: [], memoryRefs: [] }),
    } }], usage: { prompt_tokens: 100, completion_tokens: 50 } }), { headers: { 'x-litellm-model-id': 'test-only-deployment' } });
  },
}) });
await Promise.all([once(offline.server, 'listening'), once(ready.server, 'listening')]);
const offlineUrl = `http://127.0.0.1:${offline.server.address().port}`, readyUrl = `http://127.0.0.1:${ready.server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(offlineUrl); await page.locator('#begin-story').click();
  await page.getByText('기본 AI 연결을 준비하고 있어요.', { exact: true }).waitFor();
  assert.equal(await page.locator('#start select').count(), 0);
  assert.equal(await page.getByRole('button', { name: '팀 회의실 들어가기' }).isDisabled(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: join(dir, 'unconfigured-mobile.png'), fullPage: true });
  offline.game.create('existing CLI season', 'claude');
  const saved = readFileSync(offline.game.store.path, 'utf8');
  const bootstrap = await (await fetch(offlineUrl + '/api/state')).json();
  const blocked = await fetch(offlineUrl + '/api/new', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Survival-Token': bootstrap.token }, body: '{}' });
  assert.equal(blocked.status, 400);
  assert.equal(readFileSync(offline.game.store.path, 'utf8'), saved);
  assert.equal(offline.game.store.history().length, 0);
  await page.reload(); await page.getByRole('button', { name: '수첩과 설정', exact: true }).click();
  await page.locator('#restart').click();
  await page.getByText('기본 AI 연결을 준비하고 있어요. 현재 시즌은 그대로 보관됩니다.', { exact: true }).waitFor();
  assert.equal(readFileSync(offline.game.store.path, 'utf8'), saved);

  await page.goto(readyUrl); await page.locator('#begin-story').click();
  assert.equal(await page.locator('#start select').count(), 0);
  await page.getByText('기본 AI로 함께 시작해요.', { exact: true }).waitFor();
  await page.screenshot({ path: join(dir, 'ready-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: '팀 회의실 들어가기' }).click();
  await page.getByText('Round 1 / 10', { exact: true }).waitFor();
  assert.equal(ready.game.state.provider, 'litellm'); assert.equal(requests.length, 0);
  await page.locator('[data-action="open"]').click();
  await page.getByRole('alert').filter({ hasText: '요청 한도' }).waitFor();
  assert.equal(requests.length, 5);
  assert.equal(Object.values(ready.game.state.calls).filter(c => c.status === 'done').length, 4);
  assert.ok(!(await page.locator('body').innerText()).includes('secret upstream error'));
  assert.ok(!(await page.locator('body').innerText()).includes('test-only-key'));
  await page.locator('[data-action="open"]').click();
  await page.locator('#discuss').waitFor();
  assert.equal(ready.game.state.phase, 'meeting'); assert.equal(requests.length, 6);
  assert.equal(requests.filter(id => id === 'liv').length, 2);
  assert.equal(new Set(ready.game.state.rounds[1].proposals.map(p => p.agentId)).size, 5);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, mode: 'explicit-network-fixture', dir, checks: ['default-only-start', 'missing-config', 'legacy-save-preserved', 'quota-error', 'retry-only-failed-member', 'mobile'] }));
} finally {
  await browser.close();
  await Promise.all([offline, ready].map(async ({ server }) => { server.close(); await once(server, 'close'); }));
}
