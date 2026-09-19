/* global fetch */
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../../server/survival/server.mjs';
test('HTTP protects loopback game actions from cross-origin and stale requests', async () => {
  const { server } = startServer({ port: 0, dataDir: mkdtempSync(join(tmpdir(), 'rescene-http-')) });
  await once(server, 'listening'); const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const bootstrap = await (await fetch(base + '/api/state')).json();
    let res = await fetch(base + '/api/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(res.status, 403);
    res = await fetch(base + '/api/new', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Survival-Token': bootstrap.token, Origin: 'https://evil.example' }, body: '{}' }); assert.equal(res.status, 403);
    res = await fetch(base + '/api/new', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Survival-Token': bootstrap.token }, body: JSON.stringify({ seed: 'test', provider: 'claude' }) }); assert.equal(res.status, 200);
    res = await fetch(base + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Survival-Token': bootstrap.token }, body: JSON.stringify({ commandId: 'stale-command', expectedRevision: 99, action: 'open' }) }); assert.equal(res.status, 409);
    assert.equal((await fetch(base + '/../../etc/passwd')).status, 404);
  } finally { server.close(); await once(server, 'close'); }
});
