/* global process, console */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
if (process.platform !== 'darwin') throw new Error('macOS 사용자 LaunchAgent 설치기입니다');
const input = resolve(process.argv[2] || '.');
// Resolve a linked checkout to its permanent main checkout.
const common = execFileSync('/usr/bin/git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: input, encoding: 'utf8' }).trim();
const repo = dirname(common);
const slot = process.argv[3] ? resolve(process.argv[3]) : null;
const root = join(homedir(), 'Library/Application Support/RescenePeerReceiver');
const label = 'local.rescene.claude-receiver', plist = join(homedir(), 'Library/LaunchAgents', `${label}.plist`);
const node = process.execPath, orch = join(homedir(), '.claude/skills/orch-flow/scripts/orch.mjs');
const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
// Validate the official channel before installing. Do not modify orchestrator settings.
execFileSync(node, [orch, 'peer-inbox', '--for', 'codex-lead', '--json'], { cwd: repo, timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
mkdirSync(root, { recursive: true, mode: 0o700 }); mkdirSync(dirname(plist), { recursive: true });
const program = join(root, 'monitor.mjs'), configPath = join(root, 'config.json');
const oldConfig = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
if (oldConfig.actions?.enabled && existsSync(join(root, 'actions.json'))) {
  const state = JSON.parse(readFileSync(join(root, 'actions.json'), 'utf8'));
  if (state.jobs.some(j => ['running', 'validating', 'committing', 'reviewing', 'pushing'].includes(j.status))) throw Error('자동조치 실행 중: 종료 후 설치하세요');
}
if (existsSync(program)) writeFileSync(`${program}.previous`, readFileSync(program), { mode: 0o600 });
writeFileSync(program, readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'monitor.mjs')), { mode: 0o600 });
for (const file of ['actions.mjs', 'browser-bootstrap.mjs']) writeFileSync(join(root, file), readFileSync(join(dirname(fileURLToPath(import.meta.url)), file)), { mode: 0o600 });
const codex = slot ? execFileSync('/usr/bin/which', ['codex'], { encoding: 'utf8' }).trim() : oldConfig.actions?.codex;
const actions = slot ? { enabled: true, slot, codex, gate: join(homedir(), '.codex/hooks/task-finish/gate.py'), wrapper: join(homedir(), '.local/share/engine-exchange/tools/orch/codex-call.sh'), tracks: process.argv.slice(4) } : oldConfig.actions || { enabled: false };
writeFileSync(configPath, JSON.stringify({ repo, node, orch, actions, dataDir: root, port: 4318, path: `${dirname(node)}:${codex ? dirname(codex) : '/usr/bin'}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin` }), { mode: 0o600 });
const args = [node, program, configPath].map(s => `<string>${xml(s)}</string>`).join('');
writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array>${args}</array><key>WorkingDirectory</key><string>${xml(repo)}</string><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer><key>StandardOutPath</key><string>${xml(join(root, 'receiver.log'))}</string><key>StandardErrorPath</key><string>${xml(join(root, 'receiver-error.log'))}</string><key>ProcessType</key><string>Background</string></dict></plist>`, { mode: 0o600 });
execFileSync('/usr/bin/plutil', ['-lint', plist], { stdio: 'inherit' });
const domain = `gui/${process.getuid()}`;
let installed = false;
try { execFileSync('/bin/launchctl', ['print', `${domain}/${label}`], { stdio: 'ignore' }); installed = true; }
catch { /* bootstrap below reports an unavailable launchd domain or other installation failure. */ }
if (installed) execFileSync('/bin/launchctl', ['bootout', domain, plist], { stdio: 'pipe' });
execFileSync('/bin/launchctl', ['bootstrap', domain, plist], { stdio: 'inherit' });
console.log(JSON.stringify({ label, plist, root, url: 'http://127.0.0.1:4318', automaticTurnResume: false, automaticActions: actions.enabled }));
