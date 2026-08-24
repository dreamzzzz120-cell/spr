import crypto from 'node:crypto';
import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/security.ts';

const AGENT_KEY_HEADER = 'x-spr-agent-key';
const MAX_EVENT_BYTES = 128 * 1024;
const MAX_PAYLOAD_BYTES = 32 * 1024;
const EVENT_CLOCK_SKEW_MS = 5 * 60 * 1000;
const DECISION_CLOCK_SKEW_MS = 60 * 1000;

const agentCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  allowedActions: z.array(z.string().trim().min(1).max(160)).max(500).default([]),
  allowedTools: z.array(z.string().trim().min(1).max(160)).max(500).default([]),
  metadata: z.record(z.string().max(500)).optional().default({}),
}).strict();

const eventSchema = z.object({
  eventId: z.string().regex(/^[A-Za-z0-9._:-]{8,160}$/),
  timestamp: z.string().datetime({ offset: true }),
  eventType: z.enum(['action_requested', 'tool_called', 'action_completed', 'action_failed', 'configuration_changed', 'permission_changed', 'heartbeat']),
  action: z.string().trim().max(160).optional(),
  tool: z.string().trim().max(160).optional(),
  resource: z.string().trim().max(500).optional(),
  outcome: z.enum(['requested', 'allowed', 'blocked', 'completed', 'failed', 'unknown']).optional(),
  payload: z.record(z.unknown()).optional().default({}),
}).strict();

const decisionSchema = z.object({
  requestId: z.string().regex(/^[A-Za-z0-9._:-]{8,160}$/),
  timestamp: z.string().datetime({ offset: true }),
  action: z.string().trim().min(1).max(160),
  tool: z.string().trim().max(160).optional(),
  resource: z.string().trim().max(500).optional(),
}).strict();

function jsonSize(value: unknown): number {
  try { return Buffer.byteLength(JSON.stringify(value), 'utf8'); } catch { return Number.MAX_SAFE_INTEGER; }
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[REDACTED_DEPTH_LIMIT]';
  if (Array.isArray(value)) return value.slice(0, 100).map(item => redact(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (/password|secret|token|api[_-]?key|authorization|cookie|private[_-]?key/i.test(key)) {
      output[key] = '[REDACTED]';
    } else {
      output[key] = redact(item, depth + 1);
    }
  }
  return output;
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key, 'utf8').digest('hex');
}

function timingSafeHashMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function withinSkew(timestamp: string, maxSkewMs: number): boolean {
  const time = Date.parse(timestamp);
  return Number.isFinite(time) && Math.abs(Date.now() - time) <= maxSkewMs;
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 500);
}

async function lookupAgentByKey(key: string) {
  if (!/^spr_agent_[A-Za-z0-9_-]{40,}$/.test(key)) return null;
  const keyHash = hashKey(key);
  const result = await db.execute(sql`
    SELECT id, tenant_id, name, status, allowed_actions, allowed_tools, metadata
    FROM ai_agent_trust_agents
    WHERE api_key_hash = ${keyHash}
    LIMIT 1
  `);
  const row = (result.rows as any[])[0];
  if (!row || row.status !== 'ACTIVE') return null;
  return row;
}

async function recordAlert(tenantId: string, agentId: string, agentName: string, action: string, tool: string | null, resource: string | null, now: string) {
  const title = `AI Agent boundary violation: ${agentName}`;
  const description = `Observed an action outside the agent's configured boundary. Action=${action}; tool=${tool || 'not observed'}; resource=${resource || 'not observed'}.`;
  const recent = await db.execute(sql`
    SELECT id FROM alerts
    WHERE tenant_id = ${tenantId}
      AND category = 'AI Agent Trust'
      AND title = ${title}
      AND status IN ('Active', 'Acknowledged')
      AND timestamp > NOW() - INTERVAL '15 minutes'
    LIMIT 1
  `);
  if ((recent.rows as any[]).length > 0) return;
  await db.execute(sql`
    INSERT INTO alerts (
      id, tenant_id, title, severity, category, client_name, description, timestamp, status,
      deduplication_key, first_observed_at, last_observed_at, occurrence_count, updated_at
    ) VALUES (
      ${`alert-agent-${crypto.randomUUID()}`}, ${tenantId}, ${title}, 'Critical', 'AI Agent Trust',
      ${agentName}, ${description}, ${now}, 'Active',
      ${`agent-boundary:${agentId}:${action}:${tool || ''}:${resource || ''}`}, ${now}, ${now}, 1, ${now}
    )
  `);
}

async function persistEvent(agent: any, body: z.infer<typeof eventSchema>, boundaryState: string) {
  const safePayload = redact(body.payload);
  if (jsonSize(safePayload) > MAX_PAYLOAD_BYTES) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }
  const payloadJson = JSON.stringify(safePayload);
  const payloadHash = crypto.createHash('sha256').update(payloadJson, 'utf8').digest('hex');
  const now = new Date().toISOString();
  await db.execute(sql`
    INSERT INTO ai_agent_trust_events (
      id, tenant_id, agent_id, event_id, event_type, action, tool, resource, outcome,
      boundary_state, observed_at, payload_json, payload_hash, created_at
    ) VALUES (
      ${`agent-event-${crypto.randomUUID()}`}, ${agent.tenant_id}, ${agent.id}, ${body.eventId}, ${body.eventType},
      ${body.action || null}, ${body.tool || null}, ${body.resource || null}, ${body.outcome || null},
      ${boundaryState}, ${body.timestamp}, ${payloadJson}, ${payloadHash}, ${now}
    )
  `);
  await db.execute(sql`
    UPDATE ai_agent_trust_agents
    SET last_seen_at = ${now}, last_event_at = ${now}
    WHERE id = ${agent.id} AND tenant_id = ${agent.tenant_id} AND status = 'ACTIVE'
  `);
  return { payloadHash, observedAt: body.timestamp };
}

function evaluateBoundary(agent: any, action: string | undefined, tool: string | undefined) {
  const allowedActions = normalizeList(agent.allowed_actions);
  const allowedTools = normalizeList(agent.allowed_tools);
  const actionAllowed = Boolean(action) && allowedActions.includes(action!);
  const toolAllowed = !tool || allowedTools.includes(tool);
  const allowed = actionAllowed && toolAllowed;
  return {
    allowed,
    state: allowed ? 'WITHIN_BOUNDARY' : 'OUT_OF_BOUNDARY',
    actionObserved: Boolean(action),
    toolObserved: Boolean(tool),
    actionConfigured: actionAllowed,
    toolConfigured: toolAllowed,
  };
}

function agentAuth(req: any, res: any, next: any) {
  const key = String(req.header(AGENT_KEY_HEADER) || '').trim();
  if (!key) return res.status(401).json({ error: 'AGENT_AUTH_REQUIRED' });
  lookupAgentByKey(key).then(agent => {
    if (!agent) return res.status(401).json({ error: 'AGENT_AUTH_INVALID' });
    req.sprAgent = agent;
    next();
  }).catch(next);
}

export function createAgentTrustRouter() {
  const router = Router();

  // Authenticated management plane: workspace administrators create/revoke agent identities.
  router.get('/agent-trust/agents', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await db.execute(sql`
        SELECT id, name, status, api_key_prefix, allowed_actions, allowed_tools, metadata,
               created_by, created_at, last_seen_at, last_decision_at, last_event_at, revoked_at
        FROM ai_agent_trust_agents
        WHERE tenant_id = ${req.user!.tenantId}
        ORDER BY created_at DESC
      `);
      res.json((result.rows as any[]).map(row => ({
        ...row,
        allowedActions: normalizeList(row.allowed_actions),
        allowedTools: normalizeList(row.allowed_tools),
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : (row.metadata || {}),
      })));
    } catch (error) { next(error); }
  });

  router.post('/agent-trust/agents', requireAuth, requireRole(['Admin']), async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = agentCreateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });
      const apiKey = `spr_agent_${crypto.randomBytes(32).toString('base64url')}`;
      const keyHash = hashKey(apiKey);
      const id = `agent-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      await db.execute(sql`
        INSERT INTO ai_agent_trust_agents (
          id, tenant_id, name, status, api_key_hash, api_key_prefix,
          allowed_actions, allowed_tools, metadata, created_by, created_at
        ) VALUES (
          ${id}, ${req.user!.tenantId}, ${parsed.data.name}, 'ACTIVE', ${keyHash}, ${apiKey.slice(0, 20)},
          ${JSON.stringify(parsed.data.allowedActions)}, ${JSON.stringify(parsed.data.allowedTools)},
          ${JSON.stringify(parsed.data.metadata)}, ${req.user!.uid}, ${now}
        )
      `);
      res.status(201).json({
        id,
        name: parsed.data.name,
        status: 'ACTIVE',
        apiKey,
        apiKeyPrefix: apiKey.slice(0, 20),
        allowedActions: parsed.data.allowedActions,
        allowedTools: parsed.data.allowedTools,
        warning: 'The API key is returned once. SPR does not persist the plaintext key.'
      });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ error: 'AGENT_KEY_COLLISION_RETRY' });
      next(error);
    }
  });

  router.post('/agent-trust/agents/:id/revoke', requireAuth, requireRole(['Admin']), async (req: AuthenticatedRequest, res, next) => {
    try {
      const now = new Date().toISOString();
      const result = await db.execute(sql`
        UPDATE ai_agent_trust_agents
        SET status = 'REVOKED', revoked_at = ${now}
        WHERE id = ${req.params.id} AND tenant_id = ${req.user!.tenantId} AND status = 'ACTIVE'
        RETURNING id, name, status, revoked_at
      `);
      const row = (result.rows as any[])[0];
      if (!row) return res.status(404).json({ error: 'AGENT_NOT_FOUND_OR_ALREADY_REVOKED' });
      res.json(row);
    } catch (error) { next(error); }
  });

  router.get('/agent-trust/agents/:id/events', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 250);
      const result = await db.execute(sql`
        SELECT id, event_id, event_type, action, tool, resource, outcome, boundary_state,
               observed_at, payload_hash, created_at
        FROM ai_agent_trust_events
        WHERE tenant_id = ${req.user!.tenantId} AND agent_id = ${req.params.id}
        ORDER BY observed_at DESC
        LIMIT ${limit}
      `);
      res.json(result.rows);
    } catch (error) { next(error); }
  });

  // Pre-action decision endpoint. Agents call this immediately before a consequential tool/API action.
  // This is an enforcement point only when the agent actually routes the action through SPR first.
  router.post('/agent-trust/authorize', agentAuth, async (req: any, res, next) => {
    try {
      const contentLength = Number(req.headers['content-length'] || 0);
      if (contentLength > 16 * 1024) return res.status(413).json({ error: 'DECISION_PAYLOAD_TOO_LARGE' });
      const parsed = decisionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });
      if (!withinSkew(parsed.data.timestamp, DECISION_CLOCK_SKEW_MS)) return res.status(400).json({ error: 'STALE_OR_FUTURE_DECISION' });

      const decision = evaluateBoundary(req.sprAgent, parsed.data.action, parsed.data.tool);
      const now = new Date().toISOString();
      await db.execute(sql`
        UPDATE ai_agent_trust_agents
        SET last_seen_at = ${now}, last_decision_at = ${now}
        WHERE id = ${req.sprAgent.id} AND tenant_id = ${req.sprAgent.tenant_id} AND status = 'ACTIVE'
      `);

      const payload = JSON.stringify(redact({ requestId: parsed.data.requestId, action: parsed.data.action, tool: parsed.data.tool, resource: parsed.data.resource }));
      const payloadHash = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
      await db.execute(sql`
        INSERT INTO ai_agent_trust_events (
          id, tenant_id, agent_id, event_id, event_type, action, tool, resource, outcome,
          boundary_state, observed_at, payload_json, payload_hash, created_at
        ) VALUES (
          ${`agent-decision-${crypto.randomUUID()}`}, ${req.sprAgent.tenant_id}, ${req.sprAgent.id}, ${parsed.data.requestId},
          'action_requested', ${parsed.data.action}, ${parsed.data.tool || null}, ${parsed.data.resource || null},
          ${decision.allowed ? 'allowed' : 'blocked'}, ${decision.state}, ${parsed.data.timestamp}, ${payload}, ${payloadHash}, ${now}
        )
      `);

      if (!decision.allowed) {
        await recordAlert(req.sprAgent.tenant_id, req.sprAgent.id, req.sprAgent.name, parsed.data.action, parsed.data.tool || null, parsed.data.resource || null, now);
      }

      res.status(decision.allowed ? 200 : 403).json({
        requestId: parsed.data.requestId,
        decision: decision.allowed ? 'ALLOW' : 'DENY',
        boundaryState: decision.state,
        actionObserved: decision.actionObserved,
        toolObserved: decision.toolObserved,
        actionConfigured: decision.actionConfigured,
        toolConfigured: decision.toolConfigured,
        observedAt: now,
        enforcement: 'PRE_ACTION_POLICY_DECISION'
      });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ error: 'DUPLICATE_DECISION_REQUEST' });
      next(error);
    }
  });

  // Runtime event ingestion. This is observation, not proof of intent or semantic truth.
  router.post('/agent-trust/events', agentAuth, async (req: any, res, next) => {
    try {
      const contentLength = Number(req.headers['content-length'] || 0);
      if (contentLength > MAX_EVENT_BYTES) return res.status(413).json({ error: 'EVENT_PAYLOAD_TOO_LARGE' });
      const parsed = eventSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });
      if (!withinSkew(parsed.data.timestamp, EVENT_CLOCK_SKEW_MS)) return res.status(400).json({ error: 'STALE_OR_FUTURE_EVENT' });
      const decision = evaluateBoundary(req.sprAgent, parsed.data.action, parsed.data.tool);
      const result = await persistEvent(req.sprAgent, parsed.data, decision.state);
      if (decision.state === 'OUT_OF_BOUNDARY') {
        await recordAlert(req.sprAgent.tenant_id, req.sprAgent.id, req.sprAgent.name, parsed.data.action || 'NOT_OBSERVED', parsed.data.tool || null, parsed.data.resource || null, new Date().toISOString());
      }
      res.status(201).json({
        accepted: true,
        eventId: parsed.data.eventId,
        boundaryState: decision.state,
        payloadHash: result.payloadHash,
        statement: 'SPR recorded the supplied runtime event. This record does not establish intent or semantic truth.'
      });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ error: 'DUPLICATE_EVENT_ID' });
      if (error?.message === 'PAYLOAD_TOO_LARGE') return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
      next(error);
    }
  });

  router.get('/agent-trust/status', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await db.execute(sql`
        SELECT
          COUNT(*)::int AS agent_count,
          COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_agent_count,
          COUNT(*) FILTER (WHERE status = 'REVOKED')::int AS revoked_agent_count,
          (SELECT COUNT(*)::int FROM ai_agent_trust_events e WHERE e.tenant_id = ${req.user!.tenantId}) AS event_count,
          (SELECT COUNT(*)::int FROM ai_agent_trust_events e WHERE e.tenant_id = ${req.user!.tenantId} AND e.boundary_state = 'OUT_OF_BOUNDARY') AS boundary_violation_count
        FROM ai_agent_trust_agents
        WHERE tenant_id = ${req.user!.tenantId}
      `);
      res.json((result.rows as any[])[0] || {});
    } catch (error) { next(error); }
  });

  return router;
}
