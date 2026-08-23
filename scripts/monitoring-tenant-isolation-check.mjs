import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/routes/monitoring.ts', import.meta.url), 'utf8');
const failures = [];

// Monitoring objects must never be looked up by ID without tenant scoping.
const unscopedConfigLookup = /where\(\s*eq\(monitoringConfigurations\.id,\s*req\.params\.id\)\s*\)/s;
const unscopedJobLookup = /where\(\s*eq\(collectorJobs\.id,\s*req\.params\.id\)\s*\)/s;
const unscopedSubscriptionLookup = /where\(\s*eq\(alertSubscriptions\.id,\s*req\.params\.id\)\s*\)/s;
if (unscopedConfigLookup.test(source)) failures.push('Monitoring configuration lookup is not tenant scoped.');
if (unscopedJobLookup.test(source)) failures.push('Collector job lookup is not tenant scoped.');
if (unscopedSubscriptionLookup.test(source)) failures.push('Alert subscription lookup is not tenant scoped.');

// Every passport relationship currently accepted by monitoring must be checked against the authenticated tenant.
const passportCreateGuard = /ownedPassport\(req\.user!\.tenantId,\s*body\.passportId\)/;
if (!passportCreateGuard.test(source)) failures.push('Monitoring configuration creation lacks tenant-scoped passport ownership validation.');

// Prevent accidental exposure of stored credential references.
if (!/credentialReferenceId:\s*row\.credentialReferenceId \? 'stored' : null/.test(source)) {
  failures.push('Monitoring responses may expose credential reference identifiers.');
}

if (failures.length) {
  console.error('Monitoring tenant-isolation security gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Monitoring tenant-isolation security checks passed.');
