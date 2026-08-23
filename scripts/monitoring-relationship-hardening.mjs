import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/routes/monitoring.ts', import.meta.url), 'utf8');
const failures = [];

// A passport is the authoritative tenant/client relationship. Monitoring writes must not
// accept a caller-supplied clientId without proving it matches the selected passport.
if (!/async function ownedPassportForClient\(/.test(source)) {
  failures.push('Missing tenant + client ownership helper for passport/client relationship.');
}
if (!/ownedPassportForClient\(req\.user!\.tenantId, body\.passportId, body\.clientId\)/.test(source)) {
  failures.push('Monitoring configuration creation does not enforce passport/client consistency.');
}
if (!/ownedPassportForClient\(req\.user!\.tenantId, body\.passportId, body\.clientId\)/.test(source)) {
  failures.push('Alert subscription creation does not enforce passport/client consistency.');
}

// Patches must validate the effective relationship when either reference changes.
if (!/const effectiveClientId = body\.clientId === undefined \? current\.clientId : body\.clientId/.test(source)) {
  failures.push('Monitoring patch does not compute the effective client relationship.');
}
if (!/const effectivePassportId = body\.passportId === undefined \? current\.passportId : body\.passportId/.test(source)) {
  failures.push('Monitoring patch does not compute the effective passport relationship.');
}
if (!/const effectiveClientId = body\.clientId === undefined \? current\.clientId : body\.clientId/.test(source) ||
    !/ownedPassportForClient\(req\.user!\.tenantId, effectivePassportId, effectiveClientId\)/.test(source)) {
  failures.push('Monitoring patch does not re-authorize changed object relationships.');
}

if (failures.length) {
  console.error('Monitoring relationship hardening gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Monitoring relationship hardening gate passed.');
