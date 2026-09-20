/* global fetch */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { Game, newSeason, simulate, opponentPlan, opponentCard, checkPlan, observeHypotheses, hash } from '../../server/survival/engine.mjs';
import { members, conceptCatalog, defaultPlan } from '../../server/survival/catalog.mjs';
import { schemaFor, validate } from '../../server/survival/schemas.mjs';
import { Store } from '../../server/survival/store.mjs';
import { startServer } from '../../server/survival/server.mjs';
const intents = () => members.map(() => ({ focus: 'breath', intensity: 1 }));
let sequence = 0;
const cmd = (game, action, payload) => game.command({ commandId: `b2-command-${++sequence}`, expectedRevision: game.state.revision, action, payload });
function fixture() {
  const requests = [], store = new Store(mkdtempSync(join(tmpdir(), 'rescene-b2-')));
  const runtime = { failJudge: false, async run(req) {
    requests.push(req); const p = JSON.parse(req.prompt); let data = { agentId: req.agentId, text: '시험용 응답' };
    if (['proposal', 'discussion'].includes(p.task)) {
      const plan = defaultPlan(); if (!req.schema.properties.plan.properties.recovery) delete plan.recovery;
      data = { ...data, plan, sourceRefs: [], memoryRefs: [] };
    }
    if (p.task === 'vote') data = { ...data, approve: true, planHash: p.planHash };
    if (p.task === 'performance') data = { ...data, focus: 'breath', intensity: 1 };
    if (p.task === 'reflection') data = { ...data, eventRef: p.event.eventId, condition: '부담', action: '호흡에 집중', ...(req.schema.properties.structuredAction ? { structuredAction: { focus: 'breath' }, expectedEffect: { metric: 'breath', direction: 'down' } } : { expectedEffect: '부담 감소' }) };
    if (p.task === 'judge') {
      if (this.failJudge) throw new Error('judge failed');
      data = { ...data, scores: p.evidence.map(e => ({ teamId: e.teamId, evidenceHash: e.evidenceHash, criteria: Array(5).fill(e.teamId === 'team-0' ? 19 : 10), reason: 'fixture' })) };
    }
    return { data, sessionId: req.sessionId || `${req.contextKey}:${req.agentId}`, provider: 'fixture', usage: {}, durationMs: 1 };
  } };
  const game = new Game(store, runtime); game.create('b2', 'claude'); return { game, store, runtime, requests };
}
async function agree(game, plan = defaultPlan()) {
  await cmd(game, 'open'); await cmd(game, 'discuss', { plan, message: '함께 호흡을 지키자' }); await cmd(game, 'vote', { approve: true });
}
test('24 concept profiles select exactly 10 seeded unique stages; saved order is not regenerated', () => {
  assert.equal(conceptCatalog.length, 24);
  assert.ok(conceptCatalog.every(c => c.bpmRange.length === 2 && c.hint && c.dance && c.parts));
  for (let i = 0; i < 20; i++) { const a = newSeason(String(i)); assert.equal(new Set(a.concepts).size, 10); assert.deepEqual(a.concepts, newSeason(String(i)).concepts); }
  assert.notDeepEqual(newSeason('a').concepts, newSeason('b').concepts);
  const { game, store, runtime } = fixture(); game.state.concepts.reverse(); store.save(game.state);
  assert.deepEqual(new Game(store, runtime).state.concepts, game.state.concepts);
});
test('19 rivals have 4/8/7 tiers and their public habits control deterministic plans', () => {
  const s = newSeason('rivals'), rivals = s.teams.filter(t => t.id !== 'team-0');
  for (const [tier, count] of [['strong', 4], ['middle', 8], ['weak', 7]]) assert.equal(rivals.filter(t => t.tier === tier).length, count);
  for (const t of rivals) {
    const plan = opponentPlan(s, t); assert.deepEqual(plan, opponentPlan(s, t));
    if (t.habit === 'power') assert.equal(plan.dance, 'power');
    if (t.habit === 'risk') assert.notEqual(plan.risk, 'none');
    if (t.habit === 'steady') { assert.equal(plan.dance, 'flow'); assert.equal(plan.risk, 'none'); }
  }
});
test('first proposals include the same opponent preview, fatigue and concept recommendations', async () => {
  const { game, requests } = fixture(); await cmd(game, 'open');
  for (const req of requests) { const p = JSON.parse(req.prompt); assert.deepEqual(p.opponent, game.snapshot().opponent); assert.ok(p.conceptInfo.hint); assert.equal(p.teamCondition.minami.fatigue, 0); }
  assert.equal(opponentCard(game.state).previousScore, null);
});
test('recovery stays within agreed PP, trades training for recovery, fatigue persists once across judge retry', async () => {
  const { game, store, runtime } = fixture(); const s = game.state, t = s.teams.find(t => t.id === 'team-0');
  s.members.minami.fatigue = 80;
  const plain = simulate(s, t, defaultPlan(), intents()).events[0];
  const plan = { ...defaultPlan(), recovery: [2, 0, 0, 0, 0] };
  const recovered = simulate(s, t, plan, intents()).events[0];
  assert.equal(recovered.fatigueAtStart, 56); assert.equal(recovered.practice, 1); assert.ok(recovered.breath < plain.breath);
  assert.throws(() => checkPlan({ ...plan, recovery: [4, 0, 0, 0, 0] }), /회복/);
  assert.throws(() => checkPlan({ ...plan, recovery: [-1, 0, 0, 0, 0] }));
  await agree(game, plan); runtime.failJudge = true; await assert.rejects(cmd(game, 'perform'));
  const fatigue = game.state.members.minami.fatigue, evidence = hash(game.state.rounds[1].evidence);
  const restored = new Game(store, runtime); runtime.failJudge = false; await cmd(restored, 'perform');
  assert.equal(restored.state.members.minami.fatigue, fatigue); assert.equal(hash(restored.state.rounds[1].evidence), evidence);
  await cmd(restored, 'reflect'); assert.equal(restored.state.rounds[1].growth.minami.practice, 1);
  assert.equal(restored.state.rounds[1].growth.minami.fatigueAfter, fatigue);
});
function observationState(action = { focus: 'breath' }) {
  const s = newSeason('observations'); s.round = 2;
  s.rounds[1].evidence = [{ teamId: 'team-0', events: [{ memberId: 'minami', eventId: 'r1', breath: 50, quality: 50, allocatedPractice: 3 }] }];
  const h = { round: 1, status: 'hypothesis', structuredAction: action, expectedEffect: { metric: 'breath', direction: 'down' } };
  s.members.minami.hypotheses = [h]; return { s, h };
}
test('hypotheses require actions, compare consecutive evidence, accumulate twice and deduplicate retries', () => {
  const { s, h } = observationState({ focus: 'breath', practiceDelta: 1 });
  const e = { memberId: 'minami', eventId: 'r2', breath: 40, allocatedPractice: 4, focus: 'rhythm' };
  observeHypotheses(s, 'minami', e); assert.equal(h.status, 'hypothesis'); assert.equal(h.observations, undefined);
  e.focus = 'breath'; observeHypotheses(s, 'minami', e); observeHypotheses(s, 'minami', e);
  assert.equal(h.status, 'supported'); assert.equal(h.supportedCount, 1); assert.equal(h.observations.length, 1);
  s.rounds[2] = { evidence: [{ teamId: 'team-0', events: [e] }] }; s.round = 3;
  observeHypotheses(s, 'minami', { ...e, eventId: 'r3', breath: 30, allocatedPractice: 5 });
  assert.equal(h.supportedCount, 2); assert.equal(h.observations[1].previousEventRef, 'r2');
});
test('opposite, unchanged, untested and retired hypotheses stay distinct; old prose is not inferred', () => {
  const { s, h } = observationState();
  observeHypotheses(s, 'minami', { eventId: 'r2', breath: 60, focus: 'breath' }); assert.equal(h.status, 'contradicted');
  const same = observationState(); observeHypotheses(same.s, 'minami', { eventId: 'r2', breath: 50, focus: 'breath' });
  assert.equal(same.h.observations[0].outcome, 'unchanged'); assert.equal(same.h.supportedCount, 0);
  const old = observationState(); delete old.h.structuredAction; old.h.expectedEffect = '잘한다'; old.s.round = 4;
  observeHypotheses(old.s, 'minami', { eventId: 'r4', breath: 10, focus: 'breath' }); assert.equal(old.h.status, 'retired');
});
test('structured reflection rejects unknown metrics and out of range actions', () => {
  const reflection = { agentId: 'minami', text: '회고', eventRef: 'r1', condition: '호흡', action: '연습', structuredAction: { practiceDelta: 2 }, expectedEffect: { metric: 'quality', direction: 'up' } };
  assert.doesNotThrow(() => validate(schemaFor('reflection'), reflection));
  assert.throws(() => validate(schemaFor('reflection'), { ...reflection, structuredAction: {} }));
  assert.throws(() => validate(schemaFor('reflection'), { ...reflection, structuredAction: { practiceDelta: 3 } }));
  assert.throws(() => validate(schemaFor('reflection'), { ...reflection, expectedEffect: { metric: 'score', direction: 'up' } }));
});
test('legacy in-progress rounds keep old schemas and plans; next round rotates to B2', async () => {
  const { game, store, runtime, requests } = fixture();
  delete game.state.rounds[1].rulesVersion; delete game.state.rounds[1].plan.recovery;
  game.state.concepts = ['보존할 컨셉', ...game.state.concepts.slice(1)]; game.state.rounds[1].concept = '보존할 컨셉'; store.save(game.state);
  const restored = new Game(store, runtime), plan = defaultPlan(); delete plan.recovery;
  await agree(restored, plan); await cmd(restored, 'perform'); await cmd(restored, 'reflect');
  assert.equal(typeof restored.state.rounds[1].reflections[0].expectedEffect, 'string');
  assert.equal(restored.state.rounds[1].concept, '보존할 컨셉'); assert.equal(restored.state.members.minami.fatigue, 0);
  await cmd(restored, 'next'); await cmd(restored, 'open');
  assert.equal(restored.state.rounds[2].rulesVersion, 2); assert.equal(requests.at(-1).sessionId, null);
  assert.ok(requests.at(-1).schema.properties.plan.required.includes('recovery'));
});
test('history GET projects ranking/results only and never changes current season or calls runtime', async () => {
  const { game, store, requests } = fixture(); await agree(game); await cmd(game, 'perform'); await cmd(game, 'reflect');
  const oldId = game.state.id; game.create('next', 'claude');
  const before = readFileSync(store.path, 'utf8'), calls = requests.length;
  const { server } = startServer({ port: 0, dataDir: store.dir, runtime: { run() { throw new Error('no model'); } } });
  await once(server, 'listening'); const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const list = await (await fetch(base + '/api/history')).json(); assert.equal(list.seasons[0].id, oldId);
    const detail = await (await fetch(base + '/api/history/' + oldId)).json(); assert.equal(detail.season.rounds[0].ranking.length, 20);
    assert.equal(detail.season.rounds[0].ourResult.rank, 1);
    assert.deepEqual(Object.keys(detail.season).sort(), ['champion', 'id', 'phase', 'round', 'rounds', 'seed']);
    assert.equal((await fetch(base + '/api/history/not-an-id')).status, 400);
    assert.equal((await fetch(base + '/api/history', { headers: { Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(base + '/api/history/' + oldId, { method: 'POST' })).status, 404);
    assert.equal(readFileSync(store.path, 'utf8'), before); assert.equal(requests.length, calls);
  } finally { server.close(); await once(server, 'close'); }
});
