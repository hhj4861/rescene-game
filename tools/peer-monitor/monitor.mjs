/* global process, console, setInterval, clearInterval */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { ActionQueue, createDispatch } from './actions.mjs';
const exec = promisify(execFile);
export function receive(previous, inbox, now = new Date().toISOString()) {
  if (!Array.isArray(inbox) || inbox.some(m => typeof m.id !== 'string' || m.from !== 'claude-lead' || m.to !== 'codex-lead' || !['ask', 'reply'].includes(m.kind))) throw new Error('올바른 Claude 수신함 응답이 아닙니다');
  const seen = new Set(previous.received.map(m => m.id));
  const fresh = inbox.filter(m => !seen.has(m.id)).map(m => ({ ...m, detectedAt: now }));
  return { fresh, state: { ...previous, checkedAt: now, error: null, pending: inbox,
    received: [...previous.received, ...fresh].slice(-2000) } };
}
function atomic(path, value) { writeFileSync(`${path}.tmp`, JSON.stringify(value), { mode: 0o600 }); renameSync(`${path}.tmp`, path); }
export class Receiver {
  constructor(config, poll, notify) {
    this.config = config; this.poll = poll; this.notify = notify; this.busy = false;
    mkdirSync(config.dataDir, { recursive: true, mode: 0o700 }); this.path = join(config.dataDir, 'inbox.json');
    try { this.state = JSON.parse(readFileSync(this.path, 'utf8')); }
    catch (e) { if (e.code !== 'ENOENT') throw e; this.state = { received: [], pending: [] }; }
    this.state = { ...this.state, pid: process.pid, startedAt: new Date().toISOString(), repo: config.repo, automaticAcknowledgment: false, automaticTurnResume: false };
  }
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const { fresh, state } = receive(this.state, await this.poll());
      this.state = state; atomic(this.path, this.state);
      this.state.notificationPending = (this.state.notificationPending || 0) + fresh.length;
      if (this.state.notificationPending) {
        try { await this.notify(this.state.notificationPending); this.state.notificationPending = 0; this.state.notificationCommand = { at: new Date().toISOString(), status: 'submitted' }; }
        catch (e) { this.state.notificationCommand = { at: new Date().toISOString(), status: 'error', detail: e.message }; }
        atomic(this.path, this.state);
        console.log(JSON.stringify({ event: 'received', ids: fresh.map(m => m.id), at: state.checkedAt }));
      }
    } catch (e) { this.state.error = e.message; this.state.attemptedAt = new Date().toISOString(); atomic(this.path, this.state); }
    finally { this.busy = false; }
  }
}
const page = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>RESCENE · Claude 수신함</title><style>body{font-family:system-ui;background:#f2f0f8;color:#28243d;max-width:900px;margin:40px auto;padding:0 24px}article{background:white;border-radius:14px;padding:22px;margin:18px 0;white-space:pre-wrap;overflow-wrap:anywhere}small,p{line-height:1.7}#status{padding:16px;background:#e0ebdf;border-radius:10px}button{padding:10px;margin-right:10px}h2{font-size:16px}</style><h1>Claude 메시지 수신함</h1><p>10초마다 자동 확인 · 기존 Codex 대화에 자동 전달합니다. 대기열 등록과 실제 조치 완료를 구분합니다.</p><p id="status">연결 중…</p><button id="pending">미확인 메시지</button><button id="received">수신 기록</button><h2>자동조치</h2><section id="actions"></section><h2>메시지</h2><main id="messages"></main><script src="/app.js"></script></html>`;
export const dashboardScript = String.raw`let mode='pending';const status=document.querySelector('#status'),box=document.querySelector('#messages');async function refresh(){try{const r=await fetch('/api/inbox');if(!r.ok)throw Error('수신기 응답 오류');const s=await r.json();status.textContent=(s.error?'확인 실패: '+s.error:'수신기 실행 중')+' · 최근 확인 '+(s.checkedAt||'대기')+' · 미확인 '+s.pending.length+'건';const panel=document.querySelector('#actions');panel.replaceChildren();for(const j of [...(s.actions?.jobs||[])].reverse()){const a=document.createElement('article');a.textContent=j.id+' · '+({pendingDelivery:'전달 대기',dispatching:'전달 중',awaitingAgent:'Codex 처리 대기',peerResolved:'공식 우편함 확인 처리됨',deliveryUncertain:'전달 확인 필요'}[j.status]||j.status)+(j.threadId?' · Codex '+j.threadId:'')+(j.commit?' · 커밋 '+j.commit:'')+(j.error?'\n'+j.error:'')+(j.deliveryError?'\n회신 실패: '+j.deliveryError:'');panel.append(a);}if(!s.actionsEnabled)panel.textContent='자동조치 비활성';box.replaceChildren();for(const m of [...s[mode]].reverse()){const a=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('p'),small=document.createElement('small');h.textContent=(m.track||'메시지')+' · '+m.kind;p.textContent=m.detail;small.textContent=m.ts+' · '+m.id;a.append(h,p,small);box.append(a);}if(!s[mode].length)box.textContent='메시지가 없습니다.';}catch(e){status.textContent='연결 끊김: '+e.message;}}for(const id of ['pending','received'])document.getElementById(id).onclick=()=>{mode=id;refresh();};refresh();setInterval(refresh,3000);`;
export async function start(config) {
  const receiver = new Receiver(config, async () => {
    const { stdout } = await exec(config.node, [config.orch, 'peer-inbox', '--for', 'codex-lead', '--json'], { cwd: config.repo, timeout: 8000, maxBuffer: 5 * 1024 * 1024, env: { ...process.env, PATH: config.path } });
    return JSON.parse(stdout);
  }, async count => {
    // No message body enters executable code or the notification surface.
    await exec('/usr/bin/osascript', ['-e', `display notification "새 메시지 ${count}건 · http://127.0.0.1:${config.port}" with title "RESCENE · Claude 수신"`], { timeout: 5000 });
  });
  const actions = config.actions?.enabled ? new ActionQueue(config, createDispatch(config)) : null;
  const poll = async () => { await receiver.tick(); if (!receiver.state.error) void actions?.tick(receiver.state.pending).catch(e => console.error(e)); };
  const server = createServer((req, res) => {
    const host = `127.0.0.1:${config.port}`;
    if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== `http://${host}`)) { res.writeHead(403); res.end(); return; }
    const routes = { '/': ['text/html', page], '/app.js': ['text/javascript', dashboardScript], '/api/inbox': ['application/json', JSON.stringify({ ...receiver.state, actionsEnabled: Boolean(actions), actions: actions?.state })] };
    const route = req.method === 'GET' && routes[req.url];
    if (!route) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': `${route[0]}; charset=utf-8`, 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' }); res.end(route[1]);
  });
  server.on('error', e => { console.error(e.message); process.exitCode = 1; });
  await new Promise((ok, no) => { server.once('error', no); server.listen(config.port, '127.0.0.1', ok); });
  await poll();
  const timer = setInterval(poll, 10000);
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { clearInterval(timer); server.close(); });
  console.log(JSON.stringify({ event: 'started', pid: process.pid, port: config.port }));
  return { server, receiver, actions, timer };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  start(config).catch(e => { console.error(e.message); process.exitCode = 1; });
}
