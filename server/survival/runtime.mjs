/* global process, setTimeout, clearTimeout */
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { validate } from './schemas.mjs';

// One pool across providers. No inherited shell, API-key copying, or permission bypass.
export class LocalRuntime {
  constructor(dir, { timeoutMs = 120000, spawnImpl = spawn } = {}) {
    this.dir = dir; this.timeoutMs = timeoutMs; this.spawn = spawnImpl;
    this.active = 0; this.queue = []; this.children = new Set();
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  async acquire(signal) {
    if (signal?.aborted) throw new Error('사용자가 호출을 취소했습니다');
    if (this.active < 2) { this.active++; return; }
    await new Promise(resolve => this.queue.push(resolve));
    if (signal?.aborted) { this.release(); throw new Error('사용자가 호출을 취소했습니다'); }
  }
  release() { const next = this.queue.shift(); if (next) next(); else this.active--; }
  codexRestrictions() {
    // Read table names only. Never export auth/config values. Keep normal hooks and trust.
    const configPath = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'config.toml');
    const code = 'import tomllib,json,sys\ntry:\n d=tomllib.load(open(sys.argv[1],"rb"))\nexcept FileNotFoundError:\n d={}\nr={k:list(d.get(k,{})) for k in ["plugins","mcp_servers","apps"]}\nr["model"]=d.get("model")\nprint(json.dumps(r))';
    const names = JSON.parse(execFileSync('python3', ['-c', code, configPath], { encoding: 'utf8', timeout: 5000 }));
    const args = [];
    const set = v => args.push('-c', v);
    for (const k of ['shell_tool', 'unified_exec', 'apps', 'browser_use', 'computer_use', 'in_app_browser', 'multi_agent', 'image_generation', 'code_mode_host', 'standalone_web_search']) set(`features.${k}=false`);
    set('web_search="disabled"'); set('sandbox_mode="read-only"');
    for (const kind of ['plugins', 'mcp_servers', 'apps']) for (const name of names[kind]) {
      if (!/^[a-zA-Z0-9_@-]+$/.test(name)) throw new Error('Codex 도구 설정 이름을 안전하게 제한할 수 없습니다');
      set(`${kind}.${name}.enabled=false`);
    }
    return { args, model: names.model };
  }
  async run({ provider, agentId, contextKey, sessionId, prompt, schema, signal, model: pinnedModel }) {
    await this.acquire(signal);
    try {
      if (!['claude', 'codex'].includes(provider)) throw new Error('지원하지 않는 런타임');
      if (!/^[a-z0-9-]+$/.test(agentId) || !/^[a-z0-9-]+$/.test(contextKey)) throw new Error('잘못된 문맥 식별자');
      if (sessionId && !/^[0-9a-f-]{36}$/.test(sessionId)) throw new Error('잘못된 세션 ID');
      const cwd = join(this.dir, contextKey, agentId);
      mkdirSync(cwd, { recursive: true, mode: 0o700 });
      const schemaPath = join(cwd, 'response.schema.json');
      writeFileSync(schemaPath, JSON.stringify(schema), { mode: 0o600 });
      let args, requestedModel = pinnedModel;
      if (provider === 'claude') {
        args = ['-p', '--tools', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
          '--permission-mode', 'dontAsk', '--effort', 'low', '--output-format', 'json', '--json-schema', JSON.stringify(schema),
          '--system-prompt', 'You are a game character response engine. No tools. Use only the supplied game data. Return the requested structured response. Do not act as a developer.'];
        if (sessionId) args.push('--resume', sessionId);
        if (pinnedModel) args.push('--model', pinnedModel);
      } else {
        args = ['exec']; if (sessionId) args.push('resume', sessionId);
        const settings = this.codexRestrictions(); requestedModel ||= settings.model;
        if (!requestedModel) throw new Error('Codex 모델을 사용자 설정에서 명시해야 합니다');
        args.push('--skip-git-repo-check', '--json', '--model', requestedModel, '--output-schema', schemaPath, ...settings.args, '-');
      }
      const started = Date.now();
      const { stdout, stderr } = await this.execute(provider, args, { cwd, prompt, signal });
      let data, id, usage, model;
      try {
        if (provider === 'claude') {
          const result = JSON.parse(stdout);
          if (result.is_error || result.subtype !== 'success') throw new Error(result.result || result.subtype);
          if (result.permission_denials?.length) throw new Error('게임 외 도구 사용 시도가 거부됐습니다');
          data = result.structured_output ?? JSON.parse(result.result);
          id = result.session_id; usage = result.usage; model = Object.keys(result.modelUsage || {})[0] || 'unknown';
        } else {
          const events = stdout.trim().split('\n').map(line => JSON.parse(line));
          if (events.some(e => ['turn.failed', 'error'].includes(e.type))) throw new Error('Codex 호출 실패');
          if (events.some(e => e.item && /command_execution|mcp_tool_call|web_search|file_change/.test(e.item.type))) throw new Error('게임 외 도구 실행이 감지됐습니다');
          const completed = events.find(e => e.type === 'turn.completed');
          if (!completed) throw new Error('완료 이벤트가 없습니다');
          data = JSON.parse(events.filter(e => e.item?.type === 'agent_message').at(-1)?.item.text || '');
          id = events.find(e => e.type === 'thread.started')?.thread_id;
          usage = completed.usage; model = requestedModel;
        }
      } catch (e) { throw new Error(`런타임 응답 실패: ${String(e.message).slice(0, 240)}${/limit|429|quota/i.test(stdout + stderr) ? ' (사용량 한도 확인 필요)' : ''}`); }
      validate(schema, data);
      if (data.agentId !== agentId) throw new Error('다른 에이전트의 응답을 거부했습니다');
      if (!id || (sessionId && id !== sessionId)) throw new Error('정확한 세션 ID 재개에 실패했습니다');
      return { data, sessionId: id, provider, model, usage, durationMs: Date.now() - started };
    } finally { this.release(); }
  }
  execute(command, args, { cwd, prompt, signal }) {
    return new Promise((resolve, reject) => {
      let stdout = '', stderr = '', failure = null, killTimer;
      const child = this.spawn(command, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
      this.children.add(child);
      const kill = sig => { try { if (process.platform === 'win32') child.kill(sig); else process.kill(-child.pid, sig); } catch { /* Child has already exited. */ } };
      const stop = message => { if (failure) return; failure = new Error(message); kill('SIGTERM'); killTimer = setTimeout(() => kill('SIGKILL'), 1500); };
      const abort = () => stop('사용자가 호출을 취소했습니다');
      const timer = setTimeout(() => stop('모델 응답 시간 초과'), this.timeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 2000000) stop('모델 출력 크기 초과'); });
      child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
      const clean = () => { clearTimeout(timer); clearTimeout(killTimer); signal?.removeEventListener('abort', abort); this.children.delete(child); };
      child.on('error', e => { clean(); reject(new Error(`로컬 ${command} 실행 실패: ${e.code || e.message}`)); });
      child.on('close', code => { clean(); if (failure) reject(failure); else if (code !== 0) reject(new Error(`${command} 종료 코드 ${code}${/limit|429|quota/i.test(stdout + stderr) ? ': 사용량 한도' : ': 로그인·런타임 상태를 확인하세요'}`)); else resolve({ stdout, stderr }); });
      child.stdin.on('error', () => {}); child.stdin.end(prompt);
    });
  }
}
