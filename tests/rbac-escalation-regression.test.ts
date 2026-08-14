import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireRole, AuthenticatedRequest } from '../src/middleware/security.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const serverSource = readFileSync(path.join(dirname, '..', 'server.ts'), 'utf8');

describe('RBAC escalation regression guards', () => {
  const onboardingStart = serverSource.indexOf("app.post('/api/user/onboard'");
  const onboardingEnd = serverSource.indexOf("app.put('/api/user/profile'", onboardingStart);
  const onboardingRoute = serverSource.slice(onboardingStart, onboardingEnd);

  it('rejects unauthenticated onboarding before the handler can update a user', () => {
    expect(onboardingRoute).toMatch(/requireAuth/);
    expect(onboardingRoute.indexOf('requireAuth')).toBeLessThan(onboardingRoute.indexOf('async'));
  });

  it('does not allow a Viewer to invoke onboarding', () => {
    expect(onboardingRoute).toMatch(/requireRole\(\['Owner'\]\)/);
  });

  it('does not assign Owner or Admin from client onboarding input', () => {
    expect(onboardingRoute).not.toMatch(/role:\s*['"]Owner['"]/);
    expect(onboardingRoute).not.toMatch(/role:\s*['"]Admin['"]/);
    expect(onboardingRoute).not.toMatch(/tenantId:\s*newTenantId/);
  });

  it('does not allow Admin users to access Owner-only routes via requireRole', async () => {
    const req = { user: { role: 'Admin' } } as AuthenticatedRequest;
    const res: any = {};
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (payload: unknown) => { res.body = payload; return res; };
    const next = vi.fn();

    await requireRole(['Owner'])(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      error: 'Forbidden: Insufficient privileges',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('keeps role changes behind server-side Owner/Admin authorization', () => {
    const inviteStart = serverSource.indexOf("app.post('/api/organization/invite'");
    const inviteEnd = serverSource.indexOf("app.put('/api/organization/team/:userId/role'", inviteStart);
    const inviteRoute = serverSource.slice(inviteStart, inviteEnd);
    const roleRoute = serverSource.slice(inviteEnd, serverSource.indexOf("app.delete('/api/organization/team/:userId'", inviteEnd));
    expect(inviteRoute).toMatch(/requireAuth, requireRole\(\['Owner', 'Admin'\]\)/);
    expect(inviteRoute).toMatch(/if \(role === 'Owner' && req\.user!\.role !== 'Owner'\)/);
    expect(roleRoute).toMatch(/requireAuth, requireRole\(\['Owner', 'Admin'\]\)/);
    expect(roleRoute).toMatch(/Only the workspace Owner can transfer ownership/);
  });
});
