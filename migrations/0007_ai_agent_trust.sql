BEGIN;

-- SPR AI Agent Trust: isolated agent identities, pre-action authorization, and immutable observations.
-- Secrets are never stored in plaintext; only a SHA-256 digest of the bearer key is persisted.

CREATE TABLE IF NOT EXISTS ai_agent_trust_agents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  api_key_hash TEXT NOT NULL UNIQUE,
  api_key_prefix TEXT NOT NULL,
  allowed_actions TEXT NOT NULL DEFAULT '[]',
  allowed_tools TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  last_decision_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ai_agent_trust_agents_tenant_idx
  ON ai_agent_trust_agents (tenant_id, status);

CREATE TABLE IF NOT EXISTS ai_agent_trust_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL REFERENCES ai_agent_trust_agents(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  action TEXT,
  tool TEXT,
  resource TEXT,
  outcome TEXT,
  boundary_state TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, agent_id, event_id)
);

CREATE INDEX IF NOT EXISTS ai_agent_trust_events_agent_time_idx
  ON ai_agent_trust_events (tenant_id, agent_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS ai_agent_trust_events_boundary_idx
  ON ai_agent_trust_events (tenant_id, boundary_state, observed_at DESC);

COMMIT;
