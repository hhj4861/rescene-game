import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ActionQueue, allowed, validateReport } from './actions.mjs';
const config = () => ({ dataDir: mkdtempSync(join(tmpdir(), 'peer-actions-')), actions: { enabled: true } });
const msg = id => ({ id, from: 'claude-lead', to: 'codex-lead', kind: 'ask', track: 'survival-test', detail: '$(do-not-execute)' });
test('serial actions, durable deduplication, and actual delivery follow execution', async () => {
  const c = config(), order = []; let release;
  const q = new ActionQueue(c, async job => { order.push(`start-${job.id}`); if (job.id === 'one') await new Promise(r => { release = r; }); return { outcome: 'checked' }; }, async job => { order.push(`reply-${job.id}`); });
  const first = q.tick([msg('one')]); await q.tick([msg('one'), msg('two')]);
  assert.deepEqual(order, ['start-one']); release(); await first; await q.tick([]);
  assert.deepEqual(order, ['start-one', 'reply-one', 'start-two', 'reply-two']);
  const restarted = new ActionQueue(c, async () => assert.fail('duplicate'), async () => assert.fail('duplicate reply'));
  await restarted.tick([msg('one'), msg('two')]); assert.equal(restarted.state.jobs.length, 2);
});
test('failed work is preserved, reported as blocked, and stops dependent work', async () => {
  const q = new ActionQueue(config(), async () => { throw Error('permission denied'); }, async j => assert.equal(j.status, 'blocked'));
  await q.tick([msg('one'), msg('two')]); await q.tick([]);
  assert.equal(q.state.jobs[0].error, 'permission denied'); assert.equal(q.state.jobs[1].status, 'queued');
});
test('delivery failure retries delivery without reexecuting work', async () => {
  let runs = 0, sends = 0;
  const q = new ActionQueue(config(), async () => { runs++; return { commit: 'fixed' }; }, async () => { if (++sends === 1) throw Error('offline'); });
  await q.tick([msg('one')]); assert.equal(q.state.jobs[0].status, 'ready');
  await q.tick([msg('one')]); assert.equal(runs, 1); assert.equal(sends, 2); assert.equal(q.state.jobs[0].status, 'done');
});
test('restart during mutation blocks instead of replaying', async () => {
  const c = config(); writeFileSync(join(c.dataDir, 'actions.json'), JSON.stringify({ sequence: 1, jobs: [{ id: 'one', status: 'pushing', message: msg('one') }] }));
  const q = new ActionQueue(c, async () => assert.fail('must not replay'), async () => {});
  await q.tick([]); assert.equal(q.state.jobs[0].status, 'blocked'); assert.match(q.state.jobs[0].error, /재시작/);
});
test('scope filters and report checks reject unrelated, unsafe, and incomplete work', async () => {
  const c = config(); c.actions.tracks = ['survival-test'];
  const q = new ActionQueue(c, async () => ({}), async () => {});
  await q.tick([{ ...msg('a'), from: 'unknown' }, { ...msg('b'), track: 'survival-other' }, msg('../x'), msg('okay')]);
  assert.deepEqual(q.state.jobs.map(j => j.id), ['okay']);
  assert.equal(allowed('server/survival/../outside.mjs'), false);
  assert.equal(allowed('tools/peer-monitor/actions.mjs'), false);
  const report = { thread_id: 'real', files: ['server/survival/engine.mjs'], blocked: [], contract_objection: [] };
  validateReport(report); assert.throws(() => validateReport({ ...report, blocked: ['not done'] }));
  assert.throws(() => validateReport({ ...report, files: ['.git/config'] }));
});
