-- SPDX-License-Identifier: Apache-2.0
-- Convert passport document payloads from JSON text to native PostgreSQL jsonb.
-- The USING casts preserve the existing JSON values; defaults become native JSON.
BEGIN;

ALTER TABLE passports
  ALTER COLUMN sbom TYPE jsonb USING sbom::jsonb,
  ALTER COLUMN evidence TYPE jsonb USING evidence::jsonb,
  ALTER COLUMN vulnerabilities TYPE jsonb USING vulnerabilities::jsonb,
  ALTER COLUMN timeline TYPE jsonb USING timeline::jsonb;

ALTER TABLE passports
  ALTER COLUMN sbom SET DEFAULT '[]'::jsonb,
  ALTER COLUMN evidence SET DEFAULT '[]'::jsonb,
  ALTER COLUMN vulnerabilities SET DEFAULT '[]'::jsonb,
  ALTER COLUMN timeline SET DEFAULT '[]'::jsonb;

ALTER TABLE passports
  ADD CONSTRAINT passports_sbom_json_array CHECK (jsonb_typeof(sbom) = 'array'),
  ADD CONSTRAINT passports_evidence_json_array CHECK (jsonb_typeof(evidence) = 'array'),
  ADD CONSTRAINT passports_vulnerabilities_json_array CHECK (jsonb_typeof(vulnerabilities) = 'array'),
  ADD CONSTRAINT passports_timeline_json_array CHECK (jsonb_typeof(timeline) = 'array');

COMMIT;
