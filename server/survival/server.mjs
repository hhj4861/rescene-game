/* global process, URL, console, setTimeout */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { Store } from './store.mjs';
import { Game } from './engine.mjs';
import { LocalRuntime } from './runtime.mjs';
import { publicCatalog } from './catalog.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export function startServer({ port = 4317, dataDir = join(tmpdir(), 'rescene-survival-local'), runtime, lock = true } = {}) {
  const store = new Store(dataDir), lockPath = join(dataDir, 'server.lock');
  if (lock) {
    try {
      const owner = Number(readFileSync(lockPath, 'utf8'));
      try { process.kill(owner, 0); throw new Error('같은 저장 폴더를 사용하는 게임 서버가 이미 실행 중입니다'); }
      catch (e) { if (e.code !== 'ESRCH') throw e; unlinkSync(lockPath); }
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
    writeFileSync(lockPath, String(process.pid), { flag: 'wx', mode: 0o600 });
  }
  const game = new Game(store, runtime || new LocalRuntime(join(dataDir, 'runtime')));
  const token = randomBytes(24).toString('hex');
  const files = new Map([
    ['/', ['survival.html', 'text/html']], ['/survival.html', ['survival.html', 'text/html']],
    ['/src/survival/app.js', ['src/survival/app.js', 'text/javascript']],
    ['/src/survival/style.css', ['src/survival/style.css', 'text/css']],
  ]);
  const server = createServer(async (req, res) => {
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    const host = `127.0.0.1:${server.address().port}`;
    if (![host, `localhost:${server.address().port}`].includes(req.headers.host)) return send(403, { error: '로컬 주소로 접속하세요' });
    if (req.headers.origin && ![`http://${host}`, `http://localhost:${server.address().port}`].includes(req.headers.origin)) return send(403, { error: '다른 사이트에서의 요청은 허용하지 않습니다' });
    try {
      const path = new URL(req.url, `http://${host}`).pathname;
      if (req.method === 'GET' && path === '/api/state') return send(200, { state: game.snapshot(), catalog: publicCatalog, token });
      if (req.method === 'GET' && path === '/api/history') return send(200, { seasons: store.history() });
      if (req.method === 'GET' && path.startsWith('/api/history/')) return send(200, { season: store.historyItem(path.slice('/api/history/'.length)) });
      if (req.method === 'GET' && files.has(path)) {
        const [file, type] = files.get(path);
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store',
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' });
        return res.end(readFileSync(join(root, file)));
      }
      if (req.method !== 'POST' || !['/api/new', '/api/command', '/api/cancel'].includes(path)) return send(404, { error: '없는 경로입니다' });
      if (req.headers['x-survival-token'] !== token || !req.headers['content-type']?.startsWith('application/json')) return send(403, { error: '게임 화면을 새로고침하세요' });
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 20000) return send(413, { error: '요청이 너무 큽니다' }); }
      const input = JSON.parse(body || '{}');
      if (path === '/api/new') return send(200, { state: game.create(input.seed, input.provider) });
      if (path === '/api/cancel') { game.cancel(); return send(200, { cancelling: true }); }
      if (!input || typeof input.commandId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(input.commandId)
        || !Number.isInteger(input.expectedRevision) || !['open', 'discuss', 'vote', 'skipVote', 'perform', 'reflect', 'pin', 'next', 'watch', 'addSource', 'reviewSource', 'withdrawSource'].includes(input.action)
        || (input.payload !== undefined && (!input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)))) return send(400, { error: '올바른 게임 명령이 필요합니다' });
      // Acknowledgement immediately; polling shows durable progress and failures.
      if (game.state?.busy) return send(409, { error: '이미 진행 중입니다' });
      if (!game.state || (!game.state.receipts[input.commandId] && input.expectedRevision !== game.state.revision)) return send(409, { error: '화면이 오래됐습니다. 새로고침하세요' });
      const job = game.command(input); job.catch(() => {});
      return send(202, { accepted: true });
    } catch (e) { return send(400, { error: e.message }); }
  });
  server.on('close', () => { game.cancel(); if (lock) { try { unlinkSync(lockPath); } catch { /* Lock may already have been removed by the error handler. */ } } });
  server.on('error', () => { if (lock) { try { unlinkSync(lockPath); } catch { /* Lock may already have been removed by the error handler. */ } } });
  server.listen(port, '127.0.0.1');
  return { server, game };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server, game } = startServer({ port: Number(process.env.SURVIVAL_PORT || 4317), dataDir: process.env.SURVIVAL_DATA_DIR });
  server.on('listening', () => console.log(`RESCENE SURVIVAL http://127.0.0.1:${server.address().port}/survival.html`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { game.cancel(); server.close(); setTimeout(() => process.exit(0), 2000).unref(); });
}
