import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.resolve(process.cwd(), 'migrations');
const files = fs.readdirSync(migrationsDir).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort();
const versions = new Map();
const failures = [];

for (const file of files) {
  const match = file.match(/^(\d{4})_(.+)\.sql$/);
  if (!match) continue;
  const [, version] = match;
  if (versions.has(version)) failures.push(`Duplicate migration version ${version}: ${versions.get(version)}, ${file}`);
  versions.set(version, file);
}

const ordered = [...versions.keys()].sort();
for (let i = 1; i < ordered.length; i += 1) {
  const previous = Number(ordered[i - 1]);
  const current = Number(ordered[i]);
  if (current !== previous + 1) failures.push(`Migration version gap between ${String(previous).padStart(4, '0')} and ${String(current).padStart(4, '0')}`);
}

for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  if (!/^\s*BEGIN\s*;/i.test(sql)) failures.push(`${file} must begin with BEGIN;`);
  if (!/COMMIT;\s*$/i.test(sql)) failures.push(`${file} must end with COMMIT;`);
}

if (failures.length) {
  console.error('Migration hardening gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Migration hardening checks passed for ${files.length} migration files.`);
