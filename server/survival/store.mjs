import { mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, fsyncSync } from 'node:fs';
import { join } from 'node:path';
export class Store {
  constructor(dir) { this.dir = dir; mkdirSync(dir, { recursive: true, mode: 0o700 }); this.path = join(dir, 'season.json'); }
  load() {
    try { return JSON.parse(readFileSync(this.path, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; throw new Error(`저장 파일을 읽을 수 없습니다: ${e.message}`); }
  }
  save(state) {
    const temp = `${this.path}.tmp`;
    writeFileSync(temp, JSON.stringify(state), { mode: 0o600 });
    const fd = openSync(temp, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(temp, this.path);
  }
}
