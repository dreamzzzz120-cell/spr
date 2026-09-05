/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ORM definitions for migration 0008. Kept separate from the legacy schema
 * so the existing application schema is never reconstructed or overwritten.
 */
import { pgTable, text, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const vulnerabilityFindings = pgTable('vulnerability_findings', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  passportId: text('passport_id').notNull(),
  assetId: text('asset_id').notNull(),
  vulnerabilityId: text('vulnerability_id').notNull(),
  componentPurl: text('component_purl').notNull(),
  componentVersion: text('component_version'),
  findingKey: text('finding_key').notNull(),
  severity: text('severity').notNull(),
  status: text('status').notNull().default('OPEN'),
  exploitability: text('exploitability').notNull().default('UNKNOWN'),
  evidenceIds: text('evidence_ids').notNull().default('[]'),
  firstObservedAt: text('first_observed_at').notNull(),
  lastObservedAt: text('last_observed_at').notNull(),
  occurrenceCount: integer('occurrence_count').notNull().default(1),
  humanDisposition: text('human_disposition'),
  dispositionReason: text('disposition_reason'),
  dispositionActorId: text('disposition_actor_id'),
  dispositionAt: text('disposition_at'),
  verificationObservationId: text('verification_observation_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  tenantFinding: uniqueIndex('vulnerability_findings_tenant_finding').on(table.tenantId, table.findingKey),
  assetStatus: index('vulnerability_findings_asset_status').on(table.tenantId, table.assetId, table.status),
  vulnStatus: index('vulnerability_findings_vuln').on(table.tenantId, table.vulnerabilityId, table.status),
}));

export const vexStatements = pgTable('vex_statements', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  findingId: text('finding_id'),
  documentId: text('document_id').notNull(),
  documentHash: text('document_hash').notNull(),
  author: text('author'),
  timestamp: text('timestamp').notNull(),
  vulnerabilityId: text('vulnerability_id').notNull(),
  productPurl: text('product_purl'),
  status: text('status').notNull(),
  justification: text('justification'),
  impactStatement: text('impact_statement'),
  sourceType: text('source_type').notNull().default('external'),
  sourceReference: text('source_reference'),
  rawStatement: text('raw_statement').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  dedupe: uniqueIndex('vex_statements_dedupe').on(table.tenantId, table.documentHash, table.vulnerabilityId, table.productPurl),
  findingLookup: index('vex_statements_finding').on(table.tenantId, table.findingId, table.timestamp),
  lookup: index('vex_statements_lookup').on(table.tenantId, table.vulnerabilityId, table.productPurl, table.timestamp),
}));

export const psaTicketLinks = pgTable('psa_ticket_links', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  findingId: text('finding_id').notNull(),
  provider: text('provider').notNull(),
  externalTicketId: text('external_ticket_id').notNull(),
  externalStatus: text('external_status'),
  externalDisposition: text('external_disposition'),
  lastExternalUpdatedAt: text('last_external_updated_at'),
  lastSyncedAt: text('last_synced_at').notNull(),
  lastOutboundHash: text('last_outbound_hash'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  external: uniqueIndex('psa_ticket_links_external').on(table.tenantId, table.provider, table.externalTicketId),
  findingProvider: uniqueIndex('psa_ticket_links_finding_provider').on(table.tenantId, table.findingId, table.provider),
  finding: index('psa_ticket_links_finding').on(table.tenantId, table.findingId, table.provider),
}));

export const psaEvents = pgTable('psa_events', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  provider: text('provider').notNull(),
  externalEventId: text('external_event_id').notNull(),
  externalTicketId: text('external_ticket_id'),
  eventType: text('event_type').notNull(),
  payloadHash: text('payload_hash').notNull(),
  payload: text('payload').notNull(),
  receivedAt: text('received_at').notNull(),
  processedAt: text('processed_at'),
  processingStatus: text('processing_status').notNull().default('RECEIVED'),
  errorCode: text('error_code'),
}, (table) => ({
  eventDedupe: uniqueIndex('psa_events_dedupe').on(table.tenantId, table.provider, table.externalEventId),
  processing: index('psa_events_processing').on(table.tenantId, table.processingStatus, table.receivedAt),
}));

export const findingDispositionHistory = pgTable('finding_disposition_history', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  findingId: text('finding_id').notNull(),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  source: text('source').notNull(),
  actorId: text('actor_id'),
  reason: text('reason'),
  evidenceIds: text('evidence_ids').notNull().default('[]'),
  occurredAt: text('occurred_at').notNull(),
}, (table) => ({
  findingHistory: index('finding_disposition_history_finding').on(table.tenantId, table.findingId, table.occurredAt),
}));
