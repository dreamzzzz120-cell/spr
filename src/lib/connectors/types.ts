import { z } from "zod";

export const connectorCategorySchema = z.enum([
  "source-control", "ci-cd", "cloud", "containers", "artifacts", "packages",
  "security", "identity", "observability", "itsm", "msp", "saas", "data", "ai", "evidence"
]);
export type ConnectorCategory = z.infer<typeof connectorCategorySchema>;

export const connectorStatusSchema = z.enum(["planned", "available", "authenticated", "degraded", "disabled"]);
export type ConnectorStatus = z.infer<typeof connectorStatusSchema>;

export const observationSchema = z.object({
  observationId: z.string().min(1),
  connectorId: z.string().min(1),
  observedAt: z.string().datetime(),
  subject: z.string().min(1),
  subjectType: z.enum(["software", "system", "component", "deployment", "identity", "artifact", "certificate", "ai-agent", "unknown"]),
  claim: z.string().min(1),
  value: z.unknown(),
  sourceUrl: z.string().url().optional(),
  evidenceHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  confidence: z.number().min(0).max(1),
  freshnessSeconds: z.number().int().nonnegative().optional(),
});
export type Observation = z.infer<typeof observationSchema>;

export interface ConnectorContext {
  tenantId: string;
  connectionId: string;
  signal?: AbortSignal;
}

export interface Connector {
  readonly id: string;
  readonly name: string;
  readonly category: ConnectorCategory;
  readonly description: string;
  readonly status: ConnectorStatus;
  readonly auth: "oauth2" | "api-key" | "token" | "service-account" | "webhook" | "none";
  readonly capabilities: readonly string[];
  readonly baseUrl?: string;
  observe(context: ConnectorContext): Promise<Observation[]>;
}

export type ConnectorDefinition = Omit<Connector, "observe">;
