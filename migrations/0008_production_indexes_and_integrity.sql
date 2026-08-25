-- SPR production database integrity and scale hardening.
-- Non-destructive: no type changes and no user-data rewrites.

CREATE INDEX IF NOT EXISTS idx_passports_tenant_id ON passports (tenant_id, id);
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

-- NOT VALID preserves legacy rows while enforcing referential integrity for new writes.
ALTER TABLE passports ADD CONSTRAINT fk_passports_client
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

-- Prevent duplicate ingestion of the same observation/job.
CREATE UNIQUE INDEX IF NOT EXISTS uq_trust_observations_idempotency
  ON trust_observations (tenant_id, passport_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_collector_jobs_idempotency
  ON collector_jobs (tenant_id, idempotency_key);
