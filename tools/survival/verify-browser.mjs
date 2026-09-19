import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { startServer } from '../../server/survival/server.mjs';
import { defaultPlan } from '../../server/survival/catalog.mjs';
// This check is explicitly a browser integration fixture. Live-model evidence is separate.
const require = createRequire(resolve(process.env.SURVIVAL_DEPENDENCIES || '.', 'package.json'));
const { chromium } = require('@playwright/test');
const dir = mkdtempSync(join(tmpdir(), 'rescene-browser-'));
const runtime = { async run(req) {
  const p = JSON.parse(req.prompt), agentId = req.agentId; let data = { agentId, text: '브라우저 시험용 응답: 호흡을 지킬 수 있는 무대를 함께 만들자.' };
  if (['proposal', 'discussion'].includes(p.task)) data = { ...data, plan: defaultPlan(), sourceRefs: [], memoryRefs: [] };
  if (p.task === 'vote') data = { ...data, approve: true, planHash: p.planHash };
  if (p.task === 'performance') data = { ...data, focus: 'breath', intensity: 1 };
  if (p.task === 'reflection') data = { ...data, eventRef: p.event.eventId, condition: '호흡', action: '호흡 연습', expectedEffect: '부담 감소' };
  if (p.task === 'judge') data = { ...data, scores: p.evidence.map(e => ({ teamId: e.teamId, evidenceHash: e.evidenceHash, criteria: Array(5).fill(e.teamId === 'team-0' ? 19 : 10), reason: '브라우저 시험용 평가' })) };
  return { data, sessionId: `${agentId}-browser-fixture`, provider: 'fixture', usage: { input_tokens: 100 }, durationMs: 1 };
} };
const { server } = startServer({ port: 0, dataDir: dir, runtime }); await once(server, 'listening');
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/survival.html`);
  await page.getByRole('button', { name: '팀 회의실 들어가기' }).click();
  await page.getByRole('button', { name: '다섯 멤버의 첫 제안 듣기' }).click();
  await page.getByRole('button', { name: '이 계획으로 의견 나누기' }).waitFor();
  await page.getByLabel('팀원들에게 하고 싶은 말').fill('브라우저 시험: 후렴에서 호흡을 지키자.');
  await page.getByRole('button', { name: '이 계획으로 의견 나누기' }).click();
  await page.getByRole('button', { name: '나는 찬성 · 투표 시작' }).click();
  await page.getByRole('button', { name: '합의한 무대 시작' }).click();
  await page.getByRole('button', { name: '함께 돌아보고 경험 저장' }).click();
  await page.getByRole('button', { name: '다음 라운드로' }).waitFor();
  await page.getByRole('button', { name: '무대 리플레이' }).click();
  await page.screenshot({ path: join(dir, 'desktop.png'), fullPage: true });
  await page.reload(); await page.getByRole('button', { name: '다음 라운드로' }).click();
  await page.getByText('Round 2 / 10', { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: join(dir, 'mobile.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, mode: 'explicit-fixture', dir, flow: 'new → proposal → user message → discussion → vote → stage → 5 judges → reflection → reload → round 2', consoleErrors: errors }));
} finally { await browser.close(); server.close(); await once(server, 'close'); }
