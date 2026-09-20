import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { receive, Receiver, dashboardScript } from './monitor.mjs';
const message = id => ({ id, from: 'claude-lead', to: 'codex-lead', kind: 'ask', detail: '테스트 내용' });
test('detects pending messages without acknowledging and deduplicates across restart', async () => {
  const config = { dataDir: mkdtempSync(join(tmpdir(), 'peer-receiver-test-')), repo: '/test' }; let alerts = 0, inbox = [message('one')];
  const poll = async () => inbox, notify = async () => { alerts++; };
  const first = new Receiver(config, poll, notify); await first.tick(); await first.tick(); assert.equal(alerts, 1);
  const second = new Receiver(config, poll, notify); await second.tick(); assert.equal(alerts, 1);
  inbox = [message('one'), message('two')]; await second.tick(); assert.equal(alerts, 2);
  inbox = []; await second.tick(); const saved = JSON.parse(readFileSync(second.path));
  assert.equal(saved.received.length, 2); assert.equal(saved.pending.length, 0); assert.equal(saved.automaticAcknowledgment, false); assert.equal(saved.automaticTurnResume, false);
});
test('poll errors retain messages and recover on next tick', async () => {
  const config = { dataDir: mkdtempSync(join(tmpdir(), 'peer-receiver-error-')), repo: '/test' }; let fail = false;
  const r = new Receiver(config, async () => { if (fail) throw new Error('offline'); return [message('one')]; }, async () => {});
  await r.tick(); fail = true; await r.tick(); assert.equal(r.state.error, 'offline'); assert.equal(r.state.pending.length, 1);
  fail = false; await r.tick(); assert.equal(r.state.error, null); assert.equal(r.state.received.length, 1);
});
test('rejects unrelated channel data and never executes message detail', () => {
  assert.throws(() => receive({ received: [] }, [{ ...message('x'), from: 'another' }]));
  const detail = '$(touch /tmp/should-not-execute) <script>alert(1)</script>';
  assert.equal(receive({ received: [] }, [{ ...message('x'), detail }]).state.pending[0].detail, detail);
});

test('notification failure is retried without duplicating received messages', async () => {
  const config = { dataDir: mkdtempSync(join(tmpdir(), 'peer-notify-retry-')), repo: '/test' }; let attempts = 0;
  const r = new Receiver(config, async () => [message('one')], async () => { if (++attempts === 1) throw Error('notification offline'); });
  await r.tick(); assert.equal(r.state.notificationPending, 1);
  await r.tick(); assert.equal(attempts, 2); assert.equal(r.state.notificationPending, 0); assert.equal(r.state.received.length, 1);
});

test('dashboard action-status script parses with line breaks', () => { assert.doesNotThrow(() => new Function(dashboardScript)); });
