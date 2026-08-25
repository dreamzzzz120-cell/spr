#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .filter((p) => !p.startsWith('node_modules/') && !p.startsWith('dist/') && !p.endsWith('.lock'));

const patterns = [
  { name: 'private key', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { name: 'GitLab token', re: /\bglpat-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'AWS session/access token', re: /\bASIA[0-9A-Z]{16}\b/ },
  { name: 'Google service-account private key', re: /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Stripe secret key', re: /\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/ },
  { name: 'Stripe restricted key', re: /\brk_(?:live|test)_[A-Za-z0-9]{20,}\b/ },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: 'npm automation token', re: /\bnpm_[A-Za-z0-9]{36}\b/ },
  { name: 'OpenAI API key', re: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: 'JWT-like credential', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
];

const allowlistedFiles = new Set(['scripts/secret-scan.mjs']);
const findings = [];

for (const file of tracked) {
  if (allowlistedFiles.has(file)) continue;
  let text;
  try {
    text = execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch {
    continue;
  }
  for (const { name, re } of patterns) {
    if (re.test(text)) findings.push(`${file}: ${name}`);
  }
}

if (findings.length) {
  console.error('Potential secret material detected in tracked files:');
  for (const finding of findings) console.error(` - ${finding}`);
  process.exit(1);
}

console.log(`Secret scan passed: ${tracked.length} tracked files inspected.`);
