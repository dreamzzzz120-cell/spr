import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { billing, clients, users } from '../db/schema.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware/security.ts';

const FREE_PRODUCT = 'free-snapshot';
const FOUNDER_EMAIL = 'dreamzzzz120@gmail.com';

const PAID_PRODUCTS = new Set([
  'security-report', 'client-compliance', 'vendor-risk', 'compliance-evidence', 'vulnerability-findings',
  'audit-30', 'msp-executive', 'passport-evidence', 'cobranded', 'executive-json', 'multi-tenant-csv',
  'dynamic-pdf', 'dynamic-csv'
]);

export function createReportEntitlementRouter() {
  const router = Router();

  router.get('/reports/authorize', requireAuth, async (req: AuthenticatedRequest, res) => {
    const productId = String(req.query.productId || '').trim();
    const clientId = String(req.query.clientId || '').trim();
    const tenantId = req.user!.tenantId;

    if (!productId) return res.status(400).json({ authorized: false, code: 'REPORT_PRODUCT_REQUIRED' });
    if (productId === FREE_PRODUCT) return res.json({ authorized: true, entitlement: 'free' });
    if (!PAID_PRODUCTS.has(productId)) return res.status(403).json({ authorized: false, code: 'REPORT_PRODUCT_NOT_ENTITLED' });

    try {
      const founder = await db.select({ id: users.id }).from(users).where(and(eq(users.tenantId, tenantId), eq(users.email, FOUNDER_EMAIL))).limit(1);
      if (founder.length > 0) return res.json({ authorized: true, entitlement: 'founder' });

      if (clientId) {
        const clientRows = await db.select({ id: clients.id, name: clients.name }).from(clients).where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId))).limit(1);
        if (clientRows.length === 0) return res.status(404).json({ authorized: false, code: 'REPORT_CLIENT_NOT_FOUND' });
        const paid = await db.select({ id: billing.id }).from(billing).where(and(eq(billing.tenantId, tenantId), eq(billing.clientName, clientRows[0].name), eq(billing.status, 'Paid'))).limit(1);
        if (paid.length > 0) return res.json({ authorized: true, entitlement: 'paid-client' });
        return res.status(402).json({ authorized: false, code: 'REPORT_ENTITLEMENT_REQUIRED', message: 'A verified Paid billing record is required for this client report.' });
      }

      const paidTenant = await db.select({ id: billing.id }).from(billing).where(and(eq(billing.tenantId, tenantId), eq(billing.status, 'Paid'))).limit(1);
      if (paidTenant.length > 0) return res.json({ authorized: true, entitlement: 'paid-tenant' });
      return res.status(402).json({ authorized: false, code: 'REPORT_ENTITLEMENT_REQUIRED', message: 'A verified Paid billing record is required for this report.' });
    } catch (error) {
      console.error('[SPR report entitlement] authorization failed:', error);
      return res.status(503).json({ authorized: false, code: 'REPORT_ENTITLEMENT_UNAVAILABLE' });
    }
  });

  return router;
}
