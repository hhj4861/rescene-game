import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAsciiMap, toTiled } from './ascii-map';

const SRC = 'maps';
const OUT = 'public/assets/maps';
mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.txt'))) {
  const parsed = parseAsciiMap(readFileSync(join(SRC, file), 'utf8'));
  const out = join(OUT, `${parsed.id}.json`);
  writeFileSync(out, JSON.stringify(toTiled(parsed)));
  console.log(`${file} -> ${out} (${parsed.rows[0]!.length}x${parsed.rows.length}, ${parsed.objects.length} objects)`);
}
