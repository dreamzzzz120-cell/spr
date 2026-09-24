/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { and, avg, count, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  alerts,
  clients,
  passports,
  scans,
  trustObservations,
  users,
} from '../db/schema.ts';
import { psaEvents, vulnerabilityFindings } from '../db/vex-psa-schema.ts';
import { AuthenticatedRequest, rateLimiter, requireAuth, requireRole } from '../middleware/security.ts';

/**
 * Founder telemetry is intentionally read-only and tenant-scoped. An Owner
 * role is a tenant role; it must never grant cross-tenant visibility merely
 * because the route is intended for an owner/founder dashboard.
 *
 * Financial impact is not fabricated: SPR currently does not persist a
 * verified dollar-impact model, so capitalProtected is explicitly unavailable.
 */
export function createFounderRouter() {
  const router = Router();

  router.get('/metrics', rateLimiter, requireAuth, requireRole(['Owner']), async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    const [
      userCount,
      clientCount,
      passportCount,
      scanCount,
      completedScanCount,
      activeAlertCount,
      openFindingCount,
      observationCount,
      psaEventCount,
      avgScanDuration,
      averagePassportScore,
    ] = await Promise.all([
      db.select({ value: count() }).from(users).where(eq(users.tenantId, tenantId)),
      db.select({ value: count() }).from(clients).where(eq(clients.tenantId, tenantId)),
      db.select({ value: count() }).from(passports).where(eq(passports.tenantId, tenantId)),
      db.select({ value: count() }).from(scans).where(eq(scans.tenantId, tenantId)),
      db.select({ value: count() }).from(scans).where(and(eq(scans.tenantId, tenantId), eq(scans.status, 'Completed'))),
      db.select({ value: count() }).from(alerts).where(and(eq(alerts.tenantId, tenantId), eq(alerts.status, 'Active'))),
      db.select({ value: count() }).from(vulnerabilityFindings).where(and(eq(vulnerabilityFindings.tenantId, tenantId), eq(vulnerabilityFindings.status, 'OPEN'))),
      db.select({ value: count() }).from(trustObservations).where(eq(trustObservations.tenantId, tenantId)),
      db.select({ value: count() }).from(psaEvents).where(eq(psaEvents.tenantId, tenantId)),
      db.select({ value: avg(scans.durationMs) }).from(scans).where(eq(scans.tenantId, tenantId)),
      db.select({ value: avg(passports.overallScore) }).from(passports).where(eq(passports.tenantId, tenantId)),
    ]);

    const usersTotal = Number(userCount[0]?.value ?? 0);
    const clientsTotal = Number(clientCount[0]?.value ?? 0);
    const passportsTotal = Number(passportCount[0]?.value ?? 0);
    const scansTotal = Number(scanCount[0]?.value ?? 0);
    const completedScans = Number(completedScanCount[0]?.value ?? 0);
    const activeAlerts = Number(activeAlertCount[0]?.value ?? 0);
    const openFindings = Number(openFindingCount[0]?.value ?? 0);
    const observations = Number(observationCount[0]?.value ?? 0);
    const psaEventsTotal = Number(psaEventCount[0]?.value ?? 0);
    const latencyMs = Math.round(Number(avgScanDuration[0]?.value ?? 0));
    const overallScore = passportsTotal > 0
      ? Math.round(Number(averagePassportScore[0]?.value ?? 0))
      : null;

    return res.json({
      latency: latencyMs > 0 ? `${latencyMs} ms avg scan` : 'No scan telemetry',
      capitalProtected: 'Not modeled',
      throughput: `${completedScans}/${scansTotal} scans completed`,
      mitigations: `${activeAlerts} active alerts`,
      overallScore,
      auditEvents: observations + psaEventsTotal,
      activeThreats: activeAlerts + openFindings,
      systemIntegrity: 'Operational',
      organizations: clientsTotal,
      users: usersTotal,
      passports: passportsTotal,
      scans: scansTotal,
      completedScans,
      activeAlerts,
      openFindings,
      trustObservations: observations,
      psaEvents: psaEventsTotal,
      generatedAt: new Date().toISOString(),
    });
  });

  return router;
}
