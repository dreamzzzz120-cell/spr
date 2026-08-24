import { createHash, randomUUID } from "node:crypto";
import { observationSchema, type Observation } from "./types";

export interface RawObservation {
  connectorId: string;
  subject: string;
  subjectType: Observation["subjectType"];
  claim: string;
  value: unknown;
  sourceUrl?: string;
  confidence?: number;
  observedAt?: Date;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
}

export function hashEvidence(input: Omit<RawObservation, "confidence" | "observedAt">): string {
  return createHash("sha256").update(stableJson(input)).digest("hex");
}

export function normalizeObservation(raw: RawObservation): Observation {
  const observedAt = raw.observedAt ?? new Date();
  const base = {
    connectorId: raw.connectorId,
    subject: raw.subject,
    subjectType: raw.subjectType,
    claim: raw.claim,
    value: raw.value,
    sourceUrl: raw.sourceUrl,
  };
  const parsed = observationSchema.parse({
    observationId: randomUUID(),
    ...base,
    observedAt: observedAt.toISOString(),
    evidenceHash: hashEvidence(base),
    confidence: raw.confidence ?? 1,
  });
  return parsed;
}

export function normalizeObservations(raw: RawObservation[]): Observation[] {
  return raw.map(normalizeObservation);
}

export function evidenceIsFresh(observation: Observation, maxAgeSeconds: number, now = Date.now()): boolean {
  return now - Date.parse(observation.observedAt) <= maxAgeSeconds * 1000;
}

export function evidenceState(observation: Observation, maxAgeSeconds: number, now = Date.now()): "current" | "stale" {
  return evidenceIsFresh(observation, maxAgeSeconds, now) ? "current" : "stale";
}
