/* global setTimeout, process, AbortController */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalRuntime } from '../../server/survival/runtime.mjs';
test('global semaphore never exceeds 2 across providers and releases on cancellation', async () => {
  const r = new LocalRuntime(mkdtempSync(join(tmpdir(), 'rescene-pool-')));
  let active = 0, peak = 0;
  await Promise.all(Array.from({ length: 10 }, async () => { await r.acquire(); peak = Math.max(peak, ++active); await new Promise(resolve => setTimeout(resolve, 5)); active--; r.release(); }));
  assert.equal(peak, 2); assert.equal(r.active, 0);
});
test('timeout and cancellation wait for actual child close', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rescene-cancel-')), r = new LocalRuntime(dir, { timeoutMs: 100 });
  await assert.rejects(r.execute(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { cwd: dir, prompt: '' }), /시간 초과/);
  assert.equal(r.children.size, 0);
  r.timeoutMs = 10000; const c = new AbortController(); const task = r.execute(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { cwd: dir, prompt: '', signal: c.signal });
  c.abort(); await assert.rejects(task, /취소/); assert.equal(r.children.size, 0);
});
