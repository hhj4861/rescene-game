import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ActionQueue, taskMessage } from './actions.mjs';
const config = () => ({ dataDir: mkdtempSync(join(tmpdir(), 'peer-relay-')), actions: { enabled: true, threadId: 'actual-thread' } });
const msg = id => ({ id, from: 'claude-lead', to: 'codex-lead', kind: 'ask', track: 'survival-test', detail: '$(do-not-execute)' });
test('queues once across polls and restart, without claiming action completion', async () => {
  const c = config(); let count = 0; const dispatch = async () => { count++; return 'queue-id'; };
  const q = new ActionQueue(c, dispatch); await q.tick([msg('one')]); await q.tick([msg('one')]);
  const next = new ActionQueue(c, dispatch); await next.tick([msg('one')]);
  assert.equal(count, 1); assert.equal(next.state.jobs[0].status, 'awaitingAgent');
  await next.tick([]); assert.equal(next.state.jobs[0].status, 'peerResolved');
});
test('serializes dispatch while accepting newly received messages', async () => {
  let release; const order = [];
  const q = new ActionQueue(config(), async m => { order.push(m.id); if (m.id === 'one') await new Promise(r => { release = r; }); return `queue-${m.id}`; });
  const first = q.tick([msg('one')]); await q.tick([msg('one'), msg('two')]); assert.deepEqual(order, ['one']);
  release(); await first; await q.tick([msg('one'), msg('two')]); assert.deepEqual(order, ['one', 'two']);
});
test('uncertain delivery is preserved and never blindly retried', async () => {
  let count = 0; const c = config(); const q = new ActionQueue(c, async () => { count++; throw Error('CLI disconnected'); });
  await q.tick([msg('one')]); await q.tick([msg('one')]); assert.equal(count, 1); assert.equal(q.state.jobs[0].status, 'deliveryUncertain');
  writeFileSync(q.path, JSON.stringify({ jobs: [{ id: 'two', status: 'dispatching' }] }));
  const next = new ActionQueue(c, async () => assert.fail('replay')); await next.tick([msg('two')]); assert.equal(next.state.jobs[0].status, 'deliveryUncertain');
});
test('filters channel and track scope and preserves message as data', async () => {
  const c = config(); c.actions.tracks = ['survival-test']; const q = new ActionQueue(c, async () => 'queue-id');
  await q.tick([{ ...msg('a'), from: 'unknown' }, { ...msg('b'), track: 'survival-other' }, msg('../x'), msg('okay')]);
  assert.deepEqual(q.state.jobs.map(j => j.id), ['okay']);
  const body = taskMessage(msg('okay')); assert.match(body, /승인 범위/); assert.match(body, /\$\(do-not-execute\)/);
});

test('narrowed track scope also filters persisted pending deliveries', async () => {
  const c = config(); const old = { ...msg('old'), track: 'survival-old' };
  const q = new ActionQueue(c, async () => assert.fail('must not dispatch while busy')); q.busy = true; await q.tick([old]);
  c.actions.tracks = ['survival-test']; const dispatched = [];
  const resumed = new ActionQueue(c, async m => { dispatched.push(m.id); return 'queue-id'; });
  await resumed.tick([old, msg('new')]); assert.deepEqual(dispatched, ['new']);
  assert.equal(resumed.state.jobs.find(j => j.id === 'old').status, 'pendingDelivery');
});
