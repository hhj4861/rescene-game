/* global fetch, AbortController, setTimeout, structuredClone */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LiteLLMRuntime, loadLiteLLMConfig } from '../../server/survival/litellm.mjs';
import { LocalRuntime } from '../../server/survival/runtime.mjs';
import { Game } from '../../server/survival/engine.mjs';
import { Store } from '../../server/survival/store.mjs';
import { schemaFor } from '../../server/survival/schemas.mjs';
import { defaultPlan } from '../../server/survival/catalog.mjs';
import { startServer } from '../../server/survival/server.mjs';

const secret = 'test-only-secret-never-public';
const dir = () => mkdtempSync(join(tmpdir(), 'rescene-litellm-'));
function fixtureResponse(p) {
  let data = { agentId: p.agentId, text: `테스트 ${p.task}` };
  if (['proposal', 'discussion'].includes(p.task)) data = { ...data, plan: p.plan, sourceRefs: [], memoryRefs: p.memory.map(m => m.memoryId) };
  if (p.task === 'vote') data = { ...data, approve: true, planHash: p.planHash };
  if (p.task === 'performance') data = { ...data, focus: 'breath', intensity: 1 };
  if (p.task === 'reflection') data = { ...data, eventRef: p.event.eventId, condition: '호흡 부담', action: '호흡 연습', structuredAction: { focus: 'breath' }, expectedEffect: { metric: 'breath', direction: 'down' } };
  if (p.task === 'judge') data = { ...data, scores: p.evidence.map(e => ({ teamId: e.teamId, evidenceHash: e.evidenceHash, criteria: Array(5).fill(e.teamId === 'team-0' ? 19 : 10), reason: '시험용 증거' })) };
  return data;
}
async function gateway(t) {
  const state = { requests: [], status: 200, finish: 'stop', actualModel: 'fixture-gemini', deployment: 'fixture-deployment', delay: 0, active: 0, peak: 0 };
  const server = createServer(async (req, res) => {
    state.peak = Math.max(state.peak, ++state.active);
    res.once('close', () => state.active--);
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw), p = JSON.parse(body.messages[1].content);
    state.requests.push({ url: req.url, headers: req.headers, body, p });
    if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
    if (res.destroyed) return;
    if (state.status !== 200) { res.writeHead(state.status, { Location: '/do-not-follow' }); res.end(secret); return; }
    const output = { model: state.actualModel, choices: [{ finish_reason: state.finish,
      message: { content: JSON.stringify(state.data || fixtureResponse(p)) } }], usage: { prompt_tokens: 91, completion_tokens: 12 } };
    res.setHeader('Content-Type', 'application/json');
    if (state.deployment) res.setHeader('x-litellm-model-id', state.deployment);
    if (state.slowBody) { res.write('{'); return; }
    res.end(state.raw || JSON.stringify(output));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  state.config = { baseUrl: `http://127.0.0.1:${server.address().port}/llm/v1/`, apiKey: secret, model: 'game-gemini' };
  return state;
}
const request = () => ({ agentId: 'minami', contextKey: 'test-season-g1', prompt: JSON.stringify({ agentId: 'minami', task: 'performance' }), schema: schemaFor('performance'), routeModel: 'game-gemini' });
const runtime = (g, path = dir(), options = {}) => new LocalRuntime(path, { litellm: g.config, allowLocalhost: true, ...options });
let sequence = 0;
const cmd = (g, action, payload) => g.command({ commandId: `litellm-test-${++sequence}`, expectedRevision: g.state.revision, action, payload });

test('configuration rejects insecure URLs; optional absent config preserves CLI', () => {
  assert.equal(loadLiteLLMConfig(join(dir(), 'missing.json'), {}), null);
  const file = join(dir(), 'private.json'); writeFileSync(file, '{broken secret');
  assert.throws(() => loadLiteLLMConfig(file, {}), /비공개 설정/);
  assert.throws(() => loadLiteLLMConfig(null, { SURVIVAL_LITELLM_CONFIG: file + '-absent' }), /비공개 설정/);
  for (const baseUrl of ['http://example.com', 'https://user:secret@example.com', 'https://example.com?key=secret', 'https://example.com/#secret'])
    assert.throws(() => new LiteLLMRuntime({ baseUrl, model: 'game', apiKey: secret }), /설정/);
  const r = new LocalRuntime(dir(), { litellm: null });
  assert.equal(r.describe().defaultProvider, 'claude');
  assert.throws(() => r.seasonConfig('litellm'), /설정되지/);
});

test('HTTP structured output, usage, exact context and actual model pinning', async t => {
  const g = await gateway(t), r = runtime(g), req = { ...request(), provider: 'litellm' };
  const first = await r.run(req);
  assert.deepEqual(first.usage, { input_tokens: 91, output_tokens: 12 });
  assert.equal(first.model, 'fixture-gemini');
  const sent = g.requests[0]; assert.equal(sent.url, '/llm/v1/chat/completions');
  assert.equal(sent.headers.authorization, `Bearer ${secret}`);
  assert.equal(sent.body.response_format.json_schema.strict, true);
  assert.equal(sent.body.num_retries, 0); assert.equal(sent.body.tools, undefined);
  assert.equal(sent.body.timeout, 120); assert.deepEqual(sent.body.fallbacks, []);
  assert.equal(sent.body.messages.length, 2);
  assert.equal((await r.run({ ...req, sessionId: first.sessionId, model: first.model })).sessionId, first.sessionId);
  await assert.rejects(r.run({ ...req, agentId: 'woni', sessionId: first.sessionId }), /문맥/);
  await assert.rejects(r.run({ ...req, routeModel: 'different' }), /설정이 변경/);
  g.actualModel = 'changed-model'; await assert.rejects(r.run({ ...req, model: first.model }), /모델 변경/);
  g.actualModel = first.model; g.deployment = 'new-deployment';
  await assert.rejects(r.run({ ...req, deploymentId: first.deploymentId }), /배포 변경/);
  g.deployment = null; await assert.rejects(r.run(req), /식별자/);
  assert.equal(r.active, 0);
});

test('errors never expose upstream secrets, follow redirects, retry, or accept incomplete output', async t => {
  const g = await gateway(t), r = runtime(g), req = { ...request(), provider: 'litellm' };
  for (const status of [401, 403, 429, 500, 302]) {
    g.status = status; const before = g.requests.length;
    await assert.rejects(r.run(req), e => !e.message.includes(secret) && e.message.startsWith('LiteLLM'));
    assert.equal(g.requests.length, before + 1);
  }
  g.status = 200; g.finish = 'length'; await assert.rejects(r.run(req), /완성/);
  g.finish = 'stop'; g.raw = 'not JSON ' + secret; await assert.rejects(r.run(req), /JSON/);
  g.raw = null; g.data = { agentId: 'minami', text: 'bad', focus: 'breath', intensity: 9 }; await assert.rejects(r.run(req), /규칙/);
  g.data = { agentId: 'woni', text: 'bad', focus: 'breath', intensity: 1 }; await assert.rejects(r.run(req), /다른 에이전트/);
  g.raw = ' '.repeat(2000001); await assert.rejects(r.run(req), /크기 초과/);
  assert.equal(r.active, 0);
});

test('cancel, body timeout, and global concurrency release the pool', async t => {
  const g = await gateway(t), req = { ...request(), provider: 'litellm' };
  g.delay = 20; const r = runtime(g);
  await Promise.all(Array.from({ length: 5 }, () => r.run(req)));
  assert.equal(g.peak, 2); assert.equal(r.active, 0);
  g.delay = 100; const c = new AbortController();
  const pending = r.run({ ...req, signal: c.signal }); c.abort();
  await assert.rejects(pending, /취소/); assert.equal(r.active, 0);
  g.delay = 0; g.slowBody = true;
  const short = runtime(g, dir(), { timeoutMs: 60 });
  await assert.rejects(short.run(req), /시간 초과/); assert.equal(short.active, 0);
});

test('real HTTP adapter runs a round, restores member memory, excludes withdrawn sources, and preserves old saves', async t => {
  const g = await gateway(t), path = dir(), store = new Store(path);
  let game = new Game(store, runtime(g)); game.create('HTTP game');
  assert.equal(game.state.provider, 'litellm'); assert.equal(game.state.routeModel, 'game-gemini');
  await cmd(game, 'open');
  const originalSessions = structuredClone(game.state.sessions);
  await cmd(game, 'discuss', { plan: defaultPlan(), message: '모의 플레이' });
  await cmd(game, 'vote', { approve: true }); await cmd(game, 'perform'); await cmd(game, 'reflect');
  assert.equal(game.state.rounds[1].calls, 30);
  const roundOne = JSON.parse(readFileSync(store.path, 'utf8'));
  assert.equal(new Set(Object.values(game.state.sessions).map(s => s.id)).size, 5);
  for (const item of g.requests.filter(v => v.p.task === 'judge')) {
    assert.deepEqual(item.p.memory, []); assert.deepEqual(item.p.source, []);
    assert.equal(item.body.messages.length, 2);
  }
  game = new Game(store, runtime(g)); await cmd(game, 'next'); await cmd(game, 'open');
  for (const { p } of g.requests.slice(-5)) {
    assert.ok(p.memory.length); assert.ok(p.memory.every(m => m.memoryId.includes(`:${p.agentId}:`)));
    assert.equal(game.state.sessions[p.agentId].id, originalSessions[p.agentId].id);
  }
  // A fresh restored copy at the round boundary exercises source withdrawal.
  store.save(roundOne);
  game = new Game(store, runtime(g));
  await cmd(game, 'withdrawSource', { sourceId: 'minami-interview-1', reason: '검증' });
  await cmd(game, 'next'); await cmd(game, 'open');
  for (const { p, body } of g.requests.slice(-5)) {
    assert.deepEqual(p.memory, []);
    assert.ok(!p.source.some(s => s.sourceId === 'minami-interview-1'));
    assert.equal(body.messages.length, 2);
  }
  const saved = readFileSync(store.path, 'utf8'); assert.ok(!saved.includes(secret));
  const legacy = new Game(new Store(dir()), runtime(g)); legacy.create('existing', 'claude');
  const before = JSON.stringify(legacy.state);
  new Game(legacy.store, runtime(g)); assert.equal(JSON.stringify(legacy.store.load()), before);
});

test('bootstrap and saves never expose credentials; missing config cannot replace current season', async t => {
  const g = await gateway(t), path = dir(), r = runtime(g);
  const { server, game } = startServer({ port: 0, dataDir: path, runtime: r });
  await once(server, 'listening'); t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const body = await (await fetch(base + '/api/state')).text(); assert.ok(!body.includes(secret));
  const bootstrap = JSON.parse(body); assert.equal(bootstrap.runtime.defaultProvider, 'litellm');
  const response = await fetch(base + '/api/new', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Survival-Token': bootstrap.token }, body: '{}' });
  assert.equal(response.status, 200); assert.equal(game.state.provider, 'litellm');
  assert.equal((await fetch(base + '/litellm.json')).status, 404);
  const saved = readFileSync(game.store.path, 'utf8');
  const noKey = new Game(game.store, new LocalRuntime(dir(), { litellm: null }));
  assert.throws(() => noKey.create('cannot replace', 'litellm'), /설정되지/);
  assert.equal(readFileSync(game.store.path, 'utf8'), saved);
});
