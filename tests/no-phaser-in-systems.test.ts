import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('systems and data stay engine-independent', () => {
  it('never import phaser', () => {
    const files = [...walk('src/systems'), ...walk('src/data')].filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/from ['"]phaser['"]/);
    }
  });
});
