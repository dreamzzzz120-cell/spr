import crypto from 'node:crypto';
import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { psaEvents, psaTicketLinks, vulnerabilityFindings, findingDispositionHistory } from '../db/vex-psa-schema.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/security.ts';
import { applyPsaDisposition, eventIdempotencyKey, verifyPsaSignature } from '../lib/psa-sync.ts';

const linkSchema = z.object({
  findingId: z.string().min(1).max(200),
  provider: z.string().min(1).max(100),
  externalTicketId: z.string().min(1).max(300),
}).strict();

const webhookSchema = z.object({
  tenantId: z.string().min(1).max(200),
  eventId: z.string().min(1).max(300),
  eventType: z.string().min(1).max(200),
  ticketId: z.string().min(1).max(300),
  status: z.string().min(1).max(100),
  disposition: z.string().max(300).nullable().optional(),
  occurredAt: z.string().datetime(),
  findingId: z.string().min(1).max(200).optional(),
  reason: z.string().max(2000).nullable().optional(),
}).strict();

function rawBody(req: AuthenticatedRequest): string | null {
  const value = (req as AuthenticatedRequest & { rawBody?: string }).rawBody;
  return typeof value === 'string' ? value : null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505';
}

export function createPsaRouter() {
  const router = Router();

  router.get('/findings', requireAuth, async (req: AuthenticatedRequest, res) => {
    const rows = await db.select({
      id: vulnerabilityFindings.id,
      assetId: vulnerabilityFindings.assetId,
      vulnerabilityId: vulnerabilityFindings.vulnerabilityId,
      componentPurl: vulnerabilityFindings.componentPurl,
      componentVersion: vulnerabilityFindings.componentVersion,
      severity: vulnerabilityFindings.severity,
      status: vulnerabilityFindings.status,
      exploitability: vulnerabilityFindings.exploitability,
      lastObservedAt: vulnerabilityFindings.lastObservedAt,
    }).from(vulnerabilityFindings)
      .where(eq(vulnerabilityFindings.tenantId, req.user!.tenantId))
      .orderBy(desc(vulnerabilityFindings.lastObservedAt))
      .limit(200);
    res.json(rows);
  });

  router.post('/tickets/link', requireAuth, requireRole(['Admin', 'Technician']), async (req: AuthenticatedRequest, res) => {
    const parsed = linkSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR' });
    const { findingId, provider, externalTicketId } = parsed.data;
    const tenantId = req.user!.tenantId;
    const finding = await db.select({ id: vulnerabilityFindings.id })
      .from(vulnerabilityFindings)
      .where(and(eq(vulnerabilityFindings.id, findingId), eq(vulnerabilityFindings.tenantId, tenantId)))
      .then(rows => rows[0]);
    if (!finding) return res.status(404).json({ error: 'FINDING_NOT_FOUND' });

    const now = new Date().toISOString();
    try {
      const [created] = await db.insert(psaTicketLinks).values({
        id: `psa-link-${crypto.randomUUID()}`,
        tenantId, findingId, provider, externalTicketId,
        lastSyncedAt: now, createdAt: now, updatedAt: now,
      }).returning();
      return res.status(201).json(created);
    } catch (error: unknown) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await db.select().from(psaTicketLinks).where(and(
        eq(psaTicketLinks.tenantId, tenantId),
        eq(psaTicketLinks.findingId, findingId),
        eq(psaTicketLinks.provider, provider),
      )).then(rows => rows[0]);
      return res.status(200).json({ ...existing, reused: true });
    }
  });

  router.get('/events', requireAuth, requireRole(['Admin', 'Technician']), async (req: AuthenticatedRequest, res) => {
    const rows = await db.select().from(psaEvents)
      .where(eq(psaEvents.tenantId, req.user!.tenantId))
      .orderBy(desc(psaEvents.receivedAt)).limit(200);
    res.json(rows);
  });

  // Inbound PSA events are authenticated by an HMAC secret, not Firebase, because
  // the provider is an external system. The tenant ID is part of the signed body.
  router.post('/webhooks/:provider', async (req: AuthenticatedRequest, res) => {
    const secret = process.env.PSA_WEBHOOK_SECRET;
    const signature = req.header('x-spr-signature');
    const timestamp = req.header('x-spr-timestamp');
    const body = rawBody(req);
    if (!secret || !signature || !timestamp || body === null) {
      return res.status(401).json({ error: 'WEBHOOK_AUTHENTICATION_REQUIRED' });
    }
    if (!verifyPsaSignature(body, signature, secret, timestamp, 300)) {
      return res.status(401).json({ error: 'WEBHOOK_SIGNATURE_INVALID' });
    }

    const parsed = webhookSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR' });
    const payload = parsed.data;
    const provider = req.params.provider;
    const tenantId = payload.tenantId;
    const receivedAt = new Date().toISOString();
    const payloadHash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
    const eventKey = eventIdempotencyKey(tenantId, provider, payload.eventId);

    const existing = await db.select({ id: psaEvents.id, processingStatus: psaEvents.processingStatus })
      .from(psaEvents)
      .where(and(
        eq(psaEvents.tenantId, tenantId),
        eq(psaEvents.provider, provider),
        eq(psaEvents.externalEventId, payload.eventId),
      )).then(rows => rows[0]);
    if (existing) return res.status(200).json({ accepted: true, duplicate: true, eventKey });

    let event;
    try {
      [event] = await db.insert(psaEvents).values({
        id: `psa-event-${crypto.randomUUID()}`,
        tenantId, provider, externalEventId: payload.eventId,
        externalTicketId: payload.ticketId, eventType: payload.eventType,
        payloadHash, payload: body, receivedAt,
      }).returning();
    } catch (error: unknown) {
      // Concurrent duplicate deliveries can both pass the SELECT above. The
      // database unique constraint is the authoritative idempotency boundary.
      if (!isUniqueViolation(error)) throw error;
      return res.status(200).json({ accepted: true, duplicate: true, eventKey });
    }

    let resultingStatus: string | null = null;
    try {
      await db.transaction(async (tx) => {
        const link = await tx.select().from(psaTicketLinks).where(and(
          eq(psaTicketLinks.tenantId, tenantId),
          eq(psaTicketLinks.provider, provider),
          eq(psaTicketLinks.externalTicketId, payload.ticketId),
        )).then(rows => rows[0]);
        if (!link) throw new Error('TICKET_LINK_NOT_FOUND');

        const finding = await tx.select().from(vulnerabilityFindings).where(and(
          eq(vulnerabilityFindings.id, link.findingId),
          eq(vulnerabilityFindings.tenantId, tenantId),
        )).then(rows => rows[0]);
        if (!finding) throw new Error('FINDING_NOT_FOUND');

        const currentStatus = finding.status as Parameters<typeof applyPsaDisposition>[0];
        const nextStatus = applyPsaDisposition(currentStatus, payload.status, payload.disposition);
        resultingStatus = nextStatus ?? currentStatus;
        const now = new Date().toISOString();
        if (nextStatus && nextStatus !== currentStatus) {
          await tx.update(vulnerabilityFindings).set({
            status: nextStatus,
            humanDisposition: payload.disposition ?? null,
            dispositionReason: payload.reason ?? null,
            dispositionAt: now,
            updatedAt: now,
          }).where(and(eq(vulnerabilityFindings.id, finding.id), eq(vulnerabilityFindings.tenantId, tenantId)));
          await tx.insert(findingDispositionHistory).values({
            id: `finding-history-${crypto.randomUUID()}`,
            tenantId, findingId: finding.id, fromStatus: currentStatus,
            toStatus: nextStatus, source: 'PSA', reason: payload.reason ?? null,
            evidenceIds: '[]', occurredAt: now,
          });
        }

        await tx.update(psaTicketLinks).set({
          externalStatus: payload.status,
          externalDisposition: payload.disposition ?? null,
          lastExternalUpdatedAt: payload.occurredAt,
          lastSyncedAt: now,
          updatedAt: now,
        }).where(eq(psaTicketLinks.id, link.id));
      });

      await db.update(psaEvents).set({ processingStatus: 'PROCESSED', processedAt: new Date().toISOString() })
        .where(eq(psaEvents.id, event.id));
      return res.status(200).json({ accepted: true, eventKey, status: resultingStatus });
    } catch (error: unknown) {
      const code = error instanceof Error ? error.message : 'PSA_EVENT_PROCESSING_FAILED';
      await db.update(psaEvents).set({ processingStatus: 'FAILED', processedAt: new Date().toISOString(), errorCode: code.slice(0, 200) })
        .where(eq(psaEvents.id, event.id));
      if (code === 'FINDING_VERIFICATION_REQUIRED') return res.status(409).json({ error: code });
      return res.status(422).json({ error: code });
    }
  });

  return router;
}
