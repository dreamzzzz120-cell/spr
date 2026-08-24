import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/routes/agent-trust.ts', import.meta.url), 'utf8');
const failures = [];

const required = [
  ['Agent API key is hashed', /createHash\('sha256'\)/],
  ['Agent API key comparison is timing-safe', /timingSafeEqual/],
  ['Agent key format is constrained', /spr_agent_\[A-Za-z0-9_-\]/],
  ['Agent management requires Firebase authentication', /router\.get\('\/agent-trust\/agents', requireAuth/],
  ['Agent creation requires Admin RBAC', /router\.post\('\/agent-trust\/agents', requireAuth, requireRole\(\['Admin'\]\)/],
  ['Agent revocation requires Admin RBAC', /router\.post\('\/agent-trust\/agents\/:id\/revoke', requireAuth, requireRole\(\['Admin'\]\)/],
  ['Pre-action endpoint requires agent authentication', /router\.post\('\/agent-trust\/authorize', agentAuth/],
  ['Runtime event endpoint requires agent authentication', /router\.post\('\/agent-trust\/events', agentAuth/],
  ['Decision timestamps are bounded', /DECISION_CLOCK_SKEW_MS/],
  ['Event timestamps are bounded', /EVENT_CLOCK_SKEW_MS/],
  ['Event body size is bounded', /MAX_EVENT_BYTES/],
  ['Payload size is bounded', /MAX_PAYLOAD_BYTES/],
  ['Sensitive payload fields are redacted', /password\|secret\|token\|api/],
  ['Runtime payloads are hashed', /payloadHash = crypto\.createHash\('sha256'\)/],
  ['Duplicate event IDs are rejected', /DUPLICATE_EVENT_ID/],
  ['Out-of-boundary actions create alerts', /OUT_OF_BOUNDARY/],
  ['Empty permissions do not become implicit allow', /allowed = actionAllowed && toolAllowed/],
  ['Plaintext key is not inserted into SQL', /api_key_hash/],
];

for (const [label, pattern] of required) {
  if (!pattern.test(source)) failures.push(label);
}

if (source.includes('apiKey: apiKey') && !source.includes('returned once')) {
  failures.push('API key handling must explicitly document one-time display.');
}

if (failures.length) {
  console.error('AI Agent Trust security gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('AI Agent Trust security gate passed.');
