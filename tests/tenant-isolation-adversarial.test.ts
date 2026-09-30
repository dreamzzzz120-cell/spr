import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const server = readFileSync(path.join(dirname, '..', 'server.ts'), 'utf8');
const monitoring = readFileSync(path.join(dirname, '..', 'src/routes/monitoring.ts'), 'utf8');
const worker = readFileSync(path.join(dirname, '..', 'worker.ts'), 'utf8');
const security = readFileSync(path.join(dirname, '..', 'src/middleware/security.ts'), 'utf8');

describe('tenant-isolation adversarial gate', () => {
  it('derives authorization from verified DB identity, never client tenant headers/query/body', () => {
    expect(security).toContain('tenantId: dbUser.tenantId');
    expect(security).not.toMatch(/req\.headers\[['"]x-tenant/i);
    expect(security).not.toMatch(/req\.query\.tenant/i);
    expect(security).not.toMatch(/req\.body\.tenantId\s*\?\?/);
  });

  it('rejects token claims that disagree with persisted tenant or role', () => {
    expect(security).toMatch(/claimWorkspace\s*!==\s*dbUser\.tenantId/);
    expect(security).toMatch(/claimRole\s*!==\s*dbUser\.role/);
    expect(security).toMatch(/status\(403\)/);
  });

  it('tenant scopes direct monitoring object lookups and relationship creation', () => {
    expect(monitoring).not.toMatch(/where\(\s*eq\(monitoringConfigurations\.id,\s*req\.params\.id\)\s*\)/s);
    expect(monitoring).not.toMatch(/where\(\s*eq\(collectorJobs\.id,\s*req\.params\.id\)\s*\)/s);
    expect(monitoring).not.toMatch(/where\(\s*eq\(alertSubscriptions\.id,\s*req\.params\.id\)\s*\)/s);
    expect(monitoring).toMatch(/ownedPassport\(req\.user!\.tenantId,\s*body\.passportId\)/);
  });

  it('does not expose stored monitoring credential references', () => {
    expect(monitoring).toMatch(/credentialReferenceId:\s*row\.credentialReferenceId \? 'stored' : null/);
  });

  it('keeps server handlers anchored to authenticated tenant context', () => {
    expect(server).toMatch(/req\.user!\.tenantId/);
    expect(server).not.toMatch(/const\s+tenantId\s*=\s*req\.body\.tenantId/);
    expect(server).not.toMatch(/const\s+tenantId\s*=\s*req\.query\.tenantId/);
  });

  it('worker contains explicit tenant identity handling for background processing', () => {
    expect(worker).toMatch(/tenantId/);
  });
});
