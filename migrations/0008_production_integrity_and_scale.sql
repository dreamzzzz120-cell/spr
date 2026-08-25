-- SPR production integrity + scale hardening
-- Safe/idempotent: no destructive data operations.

-- 1) JSON columns: move structured payloads from text to native jsonb.
-- Invalid/blank legacy values are normalized to an empty JSON container.
ALTER TABLE passports
  ALTER COLUMN sbom TYPE jsonb USING CASE WHEN btrim(coalesce(sbom, '')) = '' THEN '[]'::jsonb ELSE sbom::jsonb END,
  ALTER COLUMN evidence TYPE jsonb USING CASE WHEN btrim(coalesce(evidence, '')) = '' THEN '[]'::jsonb ELSE evidence::jsonb END,
  ALTER COLUMN vulnerabilities TYPE jsonb USING CASE WHEN btrim(coalesce(vulnerabilities, '')) = '' THEN '[]'::jsonb ELSE vulnerabilities::jsonb END,
  ALTER COLUMN timeline TYPE jsonb USING CASE WHEN btrim(coalesce(timeline, '')) = '' THEN '[]'::jsonb ELSE timeline::jsonb END;

ALTER TABLE clients
  ALTER COLUMN software_inventory TYPE jsonb USING CASE WHEN btrim(coalesce(software_inventory, '')) = '' THEN '[]'::jsonb ELSE software_inventory::jsonb END,
  ALTER COLUMN compliance_status TYPE jsonb USING CASE WHEN btrim(coalesce(compliance_status, '')) = '' THEN '[]'::jsonb ELSE compliance_status::jsonb END,
  ALTER COLUMN team_members TYPE jsonb USING CASE WHEN btrim(coalesce(team_members, '')) = '' THEN '[]'::jsonb ELSE team_members::jsonb END,
  ALTER COLUMN activity_timeline TYPE jsonb USING CASE WHEN btrim(coalesce(activity_timeline, '')) = '' THEN '[]'::jsonb ELSE activity_timeline::jsonb END;

ALTER TABLE alerts
  ALTER COLUMN evidence_ids TYPE jsonb USING CASE WHEN btrim(coalesce(evidence_ids, '')) = '' THEN '[]'::jsonb ELSE evidence_ids::jsonb END,
  ALTER COLUMN finding_ids TYPE jsonb USING CASE WHEN btrim(coalesce(finding_ids, '')) = '' THEN '[]'::jsonb ELSE finding_ids::jsonb END;

ALTER TABLE remediation_verifications
  ALTER COLUMN evidence_ids TYPE jsonb USING CASE WHEN btrim(coalesce(evidence_ids, '')) = '' THEN '[]'::jsonb ELSE evidence_ids::jsonb END;

ALTER TABLE trust_observations
  ALTER COLUMN evidence_ids TYPE jsonb USING CASE WHEN btrim(coalesce(evidence_ids, '')) = '' THEN '[]'::jsonb ELSE evidence_ids::jsonb END,
  ALTER COLUMN finding_ids TYPE jsonb USING CASE WHEN btrim(coalesce(finding_ids, '')) = '' THEN '[]'::jsonb ELSE finding_ids::jsonb END,
  ALTER COLUMN immutable_payload TYPE jsonb USING CASE WHEN btrim(coalesce(immutable_payload, '')) = '' THEN '{}'::jsonb ELSE immutable_payload::jsonb END,
  ALTER COLUMN collector_version_map TYPE jsonb USING CASE WHEN btrim(coalesce(collector_version_map, '')) = '' THEN '{}'::jsonb ELSE collector_version_map::jsonb END;

ALTER TABLE trust_observation_changes
  ALTER COLUMN details TYPE jsonb USING CASE WHEN btrim(coalesce(details, '')) = '' THEN '{}'::jsonb ELSE details::jsonb END,
  ALTER COLUMN previous_value TYPE jsonb USING CASE WHEN btrim(coalesce(previous_value, '')) = '' THEN 'null'::jsonb ELSE previous_value::jsonb END,
  ALTER COLUMN current_value TYPE jsonb USING CASE WHEN btrim(coalesce(current_value, '')) = '' THEN 'null'::jsonb ELSE current_value::jsonb END,
  ALTER COLUMN evidence_ids TYPE jsonb USING CASE WHEN btrim(coalesce(evidence_ids, '')) = '' THEN '[]'::jsonb ELSE evidence_ids::jsonb END,
  ALTER COLUMN finding_ids TYPE jsonb USING CASE WHEN btrim(coalesce(finding_ids, '')) = '' THEN '[]'::jsonb ELSE finding_ids::jsonb END;

ALTER TABLE collector_results
  ALTER COLUMN evidence_ids TYPE jsonb USING CASE WHEN btrim(coalesce(evidence_ids, '')) = '' THEN '[]'::jsonb ELSE evidence_ids::jsonb END,
  ALTER COLUMN finding_ids TYPE jsonb USING CASE WHEN btrim(coalesce(finding_ids, '')) = '' THEN '[]'::jsonb ELSE finding_ids::jsonb END,
  ALTER COLUMN verification_methods TYPE jsonb USING CASE WHEN btrim(coalesce(verification_methods, '')) = '' THEN '[]'::jsonb ELSE verification_methods::jsonb END,
  ALTER COLUMN limitations TYPE jsonb USING CASE WHEN btrim(coalesce(limitations, '')) = '' THEN '[]'::jsonb ELSE limitations::jsonb END;

ALTER TABLE repository_scan_sources
  ALTER COLUMN manifest_paths TYPE jsonb USING CASE WHEN btrim(coalesce(manifest_paths, '')) = '' THEN '[]'::jsonb ELSE manifest_paths::jsonb END,
  ALTER COLUMN sbom_document TYPE jsonb USING CASE WHEN btrim(coalesce(sbom_document, '')) = '' THEN 'null'::jsonb ELSE sbom_document::jsonb END,
  ALTER COLUMN normalized_components TYPE jsonb USING CASE WHEN btrim(coalesce(normalized_components, '')) = '' THEN '[]'::jsonb ELSE normalized_components::jsonb END;

ALTER TABLE agent_jobs
  ALTER COLUMN result TYPE jsonb USING CASE WHEN result IS NULL OR btrim(result) = '' THEN NULL ELSE result::jsonb END;

-- 2) High-value tenant/query indexes. CONCURRENTLY is intentionally avoided so
-- the migration runner can execute the migration transactionally.
CREATE INDEX IF NOT EXISTS idx_passports_tenant_created ON passports (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_passports_tenant_client ON passports (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_tenant_asset ON evidence_items (tenant_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_status ON alerts (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_passport ON alerts (tenant_id, passport_id);
CREATE INDEX IF NOT EXISTS idx_trust_observations_tenant_passport_version ON trust_observations (tenant_id, passport_id, observation_version DESC);
CREATE INDEX IF NOT EXISTS idx_trust_observations_tenant_created ON trust_observations (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_observation_changes_tenant_passport ON trust_observation_changes (tenant_id, passport_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collector_jobs_tenant_state ON collector_jobs (tenant_id, state, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_collector_results_tenant_passport ON collector_results (tenant_id, passport_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_config_tenant_next ON monitoring_configurations (tenant_id, enabled, next_scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scan_findings_tenant_asset_status ON scan_findings (tenant_id, asset_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_trail_tenant_timestamp ON audit_trail (tenant_id, timestamp DESC);

-- 3) Tenant-scoped foreign keys. NOT VALID lets existing legacy rows remain
-- observable while enforcing the relationship for every new write. A later
-- validation gate can be run after orphan cleanup.
ALTER TABLE passports ADD CONSTRAINT fk_passports_client_tenant
  FOREIGN KEY (client_id) REFERENCES clients(id) NOT VALID;
ALTER TABLE alerts ADD CONSTRAINT fk_alerts_passport
  FOREIGN KEY (passport_id) REFERENCES passports(id) NOT VALID;
ALTER TABLE alerts ADD CONSTRAINT fk_alerts_client
  FOREIGN KEY (client_id) REFERENCES clients(id) NOT VALID;
ALTER TABLE evidence_items ADD CONSTRAINT fk_evidence_items_passport
  FOREIGN KEY (asset_id) REFERENCES passports(id) NOT VALID;
ALTER TABLE trust_observations ADD CONSTRAINT fk_trust_observations_passport
  FOREIGN KEY (passport_id) REFERENCES passports(id) NOT VALID;
ALTER TABLE trust_observation_changes ADD CONSTRAINT fk_trust_observation_changes_observation
  FOREIGN KEY (observation_id) REFERENCES trust_observations(id) NOT VALID;
ALTER TABLE collector_results ADD CONSTRAINT fk_collector_results_job
  FOREIGN KEY (job_id) REFERENCES collector_jobs(id) NOT VALID;
ALTER TABLE remediation_tasks ADD CONSTRAINT fk_remediation_tasks_alert
  FOREIGN KEY (alert_id) REFERENCES alerts(id) NOT VALID;
ALTER TABLE remediation_verifications ADD CONSTRAINT fk_remediation_verifications_task
  FOREIGN KEY (task_id) REFERENCES remediation_tasks(id) NOT VALID;
ALTER TABLE agent_logs ADD CONSTRAINT fk_agent_logs_job
  FOREIGN KEY (job_id) REFERENCES agent_jobs(id) NOT VALID;

-- 4) Idempotency guarantees for high-volume ingestion paths.
CREATE UNIQUE INDEX IF NOT EXISTS uq_trust_observations_idempotency
  ON trust_observations (tenant_id, passport_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_collector_jobs_idempotency
  ON collector_jobs (tenant_id, idempotency_key);

-- 5) JSONB integrity checks for the primary passport document.
ALTER TABLE passports ADD CONSTRAINT passports_sbom_is_array CHECK (jsonb_typeof(sbom) = 'array');
ALTER TABLE passports ADD CONSTRAINT passports_evidence_is_array CHECK (jsonb_typeof(evidence) = 'array');
ALTER TABLE passports ADD CONSTRAINT passports_vulnerabilities_is_array CHECK (jsonb_typeof(vulnerabilities) = 'array');
ALTER TABLE passports ADD CONSTRAINT passports_timeline_is_array CHECK (jsonb_typeof(timeline) = 'array');
