/* global process, console, crypto */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { Game } from '../../server/survival/engine.mjs';
import { LocalRuntime } from '../../server/survival/runtime.mjs';
import { Store } from '../../server/survival/store.mjs';
import { defaultPlan } from '../../server/survival/catalog.mjs';
if (!process.argv.includes('--live')) throw new Error('실제 구독 사용량이 발생합니다. 검증하려면 --live를 지정하세요');
const dir = process.env.SURVIVAL_VERIFY_DIR || mkdtempSync(join(tmpdir(), 'rescene-live-'));
const store = new Store(dir), runtime = new LocalRuntime(join(dir, 'runtime'));
let game = new Game(store, runtime);
if (!game.state) game.create('live-verification-20260919', process.env.SURVIVAL_PROVIDER || 'claude');
console.log(JSON.stringify({ verificationDir: dir, provider: game.state.provider }));
const cmd = async (action, payload = {}) => {
  console.log(JSON.stringify({ round: game.state.round, action, status: 'start' }));
  await game.command({ commandId: crypto.randomUUID(), expectedRevision: game.state.revision, action, payload });
  console.log(JSON.stringify({ round: game.state.round, phase: game.state.phase, calls: game.state.rounds[game.state.round].calls, status: 'done' }));
};
try {
  while (game.state.round <= 2) {
    const r = game.state.rounds[game.state.round];
    if (['announced', 'proposal'].includes(game.state.phase)) await cmd('open');
    if (['meeting', 'discussion'].includes(game.state.phase)) {
      const proposal = r.discussion[0]?.plan || r.proposals.find(p => p.memoryRefs?.length)?.plan || r.proposals[0]?.plan || defaultPlan();
      await cmd('discuss', { plan: proposal, message: '검증용 가상 플레이어의 발언: 모두의 의견을 듣고 호흡과 리듬을 안정적으로 맞추고 싶어. 지난 무대 경험이 있으면 구체적으로 반영하자. 이 계획을 검토해 줘.' });
    }
    if (['voted', 'voting'].includes(game.state.phase)) await cmd('vote', { approve: true });
    if (game.state.phase === 'meeting') continue;
    if (['agreed', 'performance', 'judging'].includes(game.state.phase)) await cmd('perform');
    if (['result', 'reflection'].includes(game.state.phase)) await cmd('reflect');
    if (game.state.phase === 'learned') {
      if (game.state.round === 2) break;
      assert.ok(game.state.teams.find(t => t.id === 'team-0').alive, '플레이어 탈락: 공식 결과를 변경하지 않고 검증 종료');
      await cmd('next');
      game = new Game(new Store(dir), new LocalRuntime(join(dir, 'runtime')));
      console.log('Reconstructed game and runtime from disk before round 2');
    }
  }
  const r2 = game.state.rounds[2];
  assert.equal(r2.learningCommitted, true);
  assert.equal(new Set(game.state.rounds[1].proposals.map(p => p.agentId)).size, 5);
  assert.ok(r2.proposals.some(p => p.memoryRefs.length > 0), 'R2에서 기억을 인용한 제안이 없음');
  const calls = Object.values(game.state.calls);
  const report = { passed: true, dir, rounds: 2, calls: calls.length,
    attempts: Object.values(game.state.rounds).reduce((n, r) => n + r.calls, 0),
    proposals: r2.proposals.map(p => ({ agentId: p.agentId, text: p.text, memoryRefs: p.memoryRefs, plan: p.plan })),
    sourceRecordsPerMember: Object.fromEntries(calls.filter(c => c.kind === 'proposal').map(c => [c.agentId, JSON.parse(c.prompt).source.length])),
    limitations: ['실제 사용자 대신 명시된 검증용 플레이어가 발언·투표', '기억 유무 대조군의 모델 품질 통계는 별도 검증 필요'] };
  writeFileSync(join(dir, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (e) { console.error(JSON.stringify({ passed: false, dir, phase: game.state.phase, error: e.message })); process.exitCode = 1; }
