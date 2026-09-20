import { mkdirSync, readdirSync, lstatSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, fsyncSync } from 'node:fs';
import { join } from 'node:path';
export class Store {
  constructor(dir) { this.dir = dir; mkdirSync(dir, { recursive: true, mode: 0o700 }); this.path = join(dir, 'season.json'); }
  load() {
    try { return JSON.parse(readFileSync(this.path, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; throw new Error(`저장 파일을 읽을 수 없습니다: ${e.message}`); }
  }
  archive(state) {
    if (!/^[0-9a-f-]{36}$/.test(state.id)) throw new Error('시즌 식별자 오류');
    const directory = join(this.dir, 'archive'); mkdirSync(directory, { recursive: true, mode: 0o700 });
    writeFileSync(join(directory, `${state.id}.json`), JSON.stringify(state), { mode: 0o600 });
  }
  history() {
    const directory = join(this.dir, 'archive');
    try {
      return readdirSync(directory).filter(file => /^[0-9a-f-]{36}\.json$/.test(file) && !lstatSync(join(directory, file)).isSymbolicLink())
        .map(file => this.historyItem(file.slice(0, -5))).map(({ rounds, ...summary }) => ({ ...summary, completedRounds: rounds.filter(r => r.ranking.length).length }));
    } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  }
  historyItem(id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) throw new Error('시즌 식별자 오류');
    const path = join(this.dir, 'archive', `${id}.json`);
    if (lstatSync(path).isSymbolicLink()) throw new Error('이력 링크는 읽을 수 없습니다');
    const s = JSON.parse(readFileSync(path, 'utf8'));
    // Explicit public projection: never disclose prompts, sessions, source drafts or receipts.
    return { id: s.id, seed: s.seed, round: s.round, phase: s.phase,
      champion: s.teams.find(t => t.id === s.champion)?.name || null,
      rounds: Object.entries(s.rounds).map(([round, r]) => ({ round: Number(round), concept: r.concept,
        ranking: r.ranking.map((t, i) => ({ rank: i + 1, teamId: t.teamId, name: t.name, score: t.total / 5, eliminated: r.eliminated.includes(t.teamId) })),
        ourResult: r.ranking.some(t => t.teamId === 'team-0') ? {
          score: r.ranking.find(t => t.teamId === 'team-0').total / 5,
          rank: r.ranking.findIndex(t => t.teamId === 'team-0') + 1, eliminated: r.eliminated.includes('team-0'),
        } : null })),
    };
  }
  save(state) {
    const temp = `${this.path}.tmp`;
    writeFileSync(temp, JSON.stringify(state), { mode: 0o600 });
    const fd = openSync(temp, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(temp, this.path);
  }
}
