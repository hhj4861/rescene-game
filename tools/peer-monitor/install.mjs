/* global process, console */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
if (process.platform !== 'darwin') throw new Error('macOS 사용자 LaunchAgent 설치기입니다');
const repo = resolve(process.argv[2] || '.');
const root = join(homedir(), 'Library/Application Support/RescenePeerReceiver');
const label = 'local.rescene.claude-receiver', plist = join(homedir(), 'Library/LaunchAgents', `${label}.plist`);
const node = process.execPath, orch = join(homedir(), '.claude/skills/orch-flow/scripts/orch.mjs');
const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
// Validate the official channel before installing. Do not modify orchestrator settings.
execFileSync(node, [orch, 'peer-inbox', '--for', 'codex-lead', '--json'], { cwd: repo, timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
mkdirSync(root, { recursive: true, mode: 0o700 }); mkdirSync(dirname(plist), { recursive: true });
const program = join(root, 'monitor.mjs'), configPath = join(root, 'config.json');
if (existsSync(program)) writeFileSync(`${program}.previous`, readFileSync(program), { mode: 0o600 });
writeFileSync(program, readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'monitor.mjs')), { mode: 0o600 });
writeFileSync(configPath, JSON.stringify({ repo, node, orch, dataDir: root, port: 4318, path: `${dirname(node)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin` }), { mode: 0o600 });
const args = [node, program, configPath].map(s => `<string>${xml(s)}</string>`).join('');
writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array>${args}</array><key>WorkingDirectory</key><string>${xml(repo)}</string><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer><key>StandardOutPath</key><string>${xml(join(root, 'receiver.log'))}</string><key>StandardErrorPath</key><string>${xml(join(root, 'receiver-error.log'))}</string><key>ProcessType</key><string>Background</string></dict></plist>`, { mode: 0o600 });
execFileSync('/usr/bin/plutil', ['-lint', plist], { stdio: 'inherit' });
const domain = `gui/${process.getuid()}`;
let installed = false;
try { execFileSync('/bin/launchctl', ['print', `${domain}/${label}`], { stdio: 'ignore' }); installed = true; }
catch { /* bootstrap below reports an unavailable launchd domain or other installation failure. */ }
if (installed) execFileSync('/bin/launchctl', ['bootout', domain, plist], { stdio: 'pipe' });
execFileSync('/bin/launchctl', ['bootstrap', domain, plist], { stdio: 'inherit' });
console.log(JSON.stringify({ label, plist, root, url: 'http://127.0.0.1:4318', automaticTurnResume: false }));
