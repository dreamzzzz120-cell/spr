-- SPDX-License-Identifier: Apache-2.0
-- Evidence-first vulnerability disposition + VEX + bidirectional PSA synchronization.
-- Idempotent: safe to replay.

BEGIN;

CREATE TABLE IF NOT EXISTS vulnerability_findings (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  passport_id text NOT NULL,
  asset_id text NOT NULL,
  vulnerability_id text NOT NULL,
  component_purl text NOT NULL,
  component_version text,
  finding_key text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','CLAIMED_FALSE_POSITIVE','UNDER_VERIFICATION','VERIFIED_NOT_AFFECTED','RISK_ACCEPTED','REMEDIATION_CLAIMED','RESOLVED','REOPENED')),
  exploitability text NOT NULL DEFAULT 'UNKNOWN' CHECK (exploitability IN ('REACHABLE','UNREACHABLE','UNKNOWN','NOT_ANALYZED')),
  evidence_ids text NOT NULL DEFAULT '[]',
  first_observed_at text NOT NULL,
  last_observed_at text NOT NULL,
  occurrence_count integer NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  human_disposition text,
  disposition_reason text,
  disposition_actor_id text,
  disposition_at text,
  verification_observation_id text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  UNIQUE (tenant_id, finding_key)
);

CREATE INDEX IF NOT EXISTS vulnerability_findings_asset_status ON vulnerability_findings (tenant_id, asset_id, status);
CREATE INDEX IF NOT EXISTS vulnerability_findings_vuln ON vulnerability_findings (tenant_id, vulnerability_id, status);

CREATE TABLE IF NOT EXISTS vex_statements (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  finding_id text,
  document_id text NOT NULL,
  document_hash text NOT NULL,
  author text,
  timestamp text NOT NULL,
  vulnerability_id text NOT NULL,
  product_purl text,
  status text NOT NULL CHECK (status IN ('not_affected','affected','fixed','under_investigation')),
  justification text,
  impact_statement text,
  source_type text NOT NULL DEFAULT 'external',
  source_reference text,
  raw_statement text NOT NULL,
  created_at text NOT NULL,
  UNIQUE (tenant_id, document_hash, vulnerability_id, product_purl)
);

CREATE INDEX IF NOT EXISTS vex_statements_finding ON vex_statements (tenant_id, finding_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS vex_statements_lookup ON vex_statements (tenant_id, vulnerability_id, product_purl, timestamp DESC);

CREATE TABLE IF NOT EXISTS psa_ticket_links (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  finding_id text NOT NULL,
  provider text NOT NULL,
  external_ticket_id text NOT NULL,
  external_status text,
  external_disposition text,
  last_external_updated_at text,
  last_synced_at text NOT NULL,
  last_outbound_hash text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  UNIQUE (tenant_id, provider, external_ticket_id),
  UNIQUE (tenant_id, finding_id, provider)
);

CREATE INDEX IF NOT EXISTS psa_ticket_links_finding ON psa_ticket_links (tenant_id, finding_id, provider);

CREATE TABLE IF NOT EXISTS psa_events (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  provider text NOT NULL,
  external_event_id text NOT NULL,
  external_ticket_id text,
  event_type text NOT NULL,
  payload_hash text NOT NULL,
  payload text NOT NULL,
  received_at text NOT NULL,
  processed_at text,
  processing_status text NOT NULL DEFAULT 'RECEIVED' CHECK (processing_status IN ('RECEIVED','PROCESSED','IGNORED','FAILED')),
  error_code text,
  UNIQUE (tenant_id, provider, external_event_id)
);

CREATE INDEX IF NOT EXISTS psa_events_processing ON psa_events (tenant_id, processing_status, received_at);

CREATE TABLE IF NOT EXISTS finding_disposition_history (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  finding_id text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  source text NOT NULL CHECK (source IN ('SYSTEM','TECHNICIAN','VEX','VERIFICATION','PSA')),
  actor_id text,
  reason text,
  evidence_ids text NOT NULL DEFAULT '[]',
  occurred_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS finding_disposition_history_finding ON finding_disposition_history (tenant_id, finding_id, occurred_at DESC);

COMMIT;
