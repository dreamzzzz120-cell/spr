/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import { z } from 'zod';

if (process.env.SKIP_DOTENV !== 'true') dotenv.config();

const trimmedString = z.preprocess((value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }
  return value;
}, z.string());

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }
  return value;
}, z.string().optional());

const optionalTrimmedUrl = z.preprocess((value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }
  return value;
}, z.string().url().optional());

const booleanString = z.union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')]);
const optionalBooleanString = z.optional(booleanString);
const optionalPositiveIntegerString = z.optional(z.string().regex(/^[1-9][0-9]*$/, 'Must be a positive integer'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  PORT: optionalPositiveIntegerString,
  APP_URL: optionalTrimmedUrl,
  APP_ALLOWED_ORIGINS: optionalTrimmedString,
  ENFORCE_HTTPS: optionalBooleanString,
  TRUST_PROXY: optionalBooleanString,
  TRUST_PROXY_HOPS: optionalPositiveIntegerString,
  ALLOW_IFRAME: optionalBooleanString,
  SQL_HOST: optionalTrimmedString,
  SQL_USER: optionalTrimmedString,
  SQL_PASSWORD: optionalTrimmedString,
  SQL_DB_NAME: optionalTrimmedString,
  DATABASE_URL: optionalTrimmedUrl,
  SQL_SSL: z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }
    return value;
  }, z.enum(['true', 'require', 'false', '1', '0']).optional()),
  SQL_POOL_MAX: optionalPositiveIntegerString,
  SQL_CONNECTION_TIMEOUT_MS: optionalPositiveIntegerString,
  SQL_IDLE_TIMEOUT_MS: optionalPositiveIntegerString,
  SQL_QUERY_TIMEOUT_MS: optionalPositiveIntegerString,
  STRIPE_SECRET_KEY: optionalTrimmedString,
  STRIPE_WEBHOOK_SECRET: optionalTrimmedString,
  GEMINI_API_KEY: optionalTrimmedString,
  FIREBASE_SERVICE_ACCOUNT_KEY: optionalTrimmedString,
  GOOGLE_APPLICATION_CREDENTIALS: optionalTrimmedString,
  SPR_INITIAL_OWNER_EMAIL: z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      return trimmed.length === 0 ? undefined : trimmed;
    }
    return value;
  }, z.string().email().optional()),
  SPR_OWNER_BOOTSTRAP_SECRET: optionalTrimmedString,
  SPR_OWNER_BOOTSTRAP_SECRET_SHA256: z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      return trimmed.length === 0 ? undefined : trimmed;
    }
    return value;
  }, z.string().regex(/^[a-f0-9]{64}$/).optional()),
  SENTRY_DSN: optionalTrimmedUrl,
  REDIS_URL: optionalTrimmedString,
  RATE_LIMIT_FAIL_OPEN: optionalBooleanString,
  MONITORING_ENABLED_TENANT_IDS: optionalTrimmedString,
});

const parseBoolean = (input: string | undefined, defaultValue: boolean) => {
  if (!input) return defaultValue;
  const normalized = input.trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
};

const parseNumber = (input: string | undefined, fallback: number) => {
  if (!input) return fallback;
  const parsed = Number(input.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseCsv = (input: string | undefined) => input ? input.split(',').map((item) => item.trim()).filter(Boolean) : [];

const parsedEnv = envSchema.parse(process.env);

export const config = {
  nodeEnv: parsedEnv.NODE_ENV ?? 'development',
  port: parsedEnv.PORT ? Number(parsedEnv.PORT) : 3000,
  isProduction: parsedEnv.NODE_ENV === 'production',
  appUrl: parsedEnv.APP_URL,
  allowedOrigins: parseCsv(parsedEnv.APP_ALLOWED_ORIGINS),
  enforceHttps: parseBoolean(parsedEnv.ENFORCE_HTTPS, false),
  trustProxy: parseBoolean(parsedEnv.TRUST_PROXY, false),
  trustProxyHops: parsedEnv.TRUST_PROXY_HOPS ? Number(parsedEnv.TRUST_PROXY_HOPS) : 0,
  allowIframe: parseBoolean(parsedEnv.ALLOW_IFRAME, false),
  database: {
    connectionString: parsedEnv.DATABASE_URL,
    host: parsedEnv.SQL_HOST,
    user: parsedEnv.SQL_USER,
    password: parsedEnv.SQL_PASSWORD,
    name: parsedEnv.SQL_DB_NAME,
    ssl: parsedEnv.SQL_SSL ? ['true', 'require'].includes(parsedEnv.SQL_SSL.toLowerCase()) : false,
    poolMax: parseNumber(parsedEnv.SQL_POOL_MAX, 12),
    connectionTimeoutMs: parseNumber(parsedEnv.SQL_CONNECTION_TIMEOUT_MS, 10000),
    idleTimeoutMs: parseNumber(parsedEnv.SQL_IDLE_TIMEOUT_MS, 30000),
    queryTimeoutMs: parseNumber(parsedEnv.SQL_QUERY_TIMEOUT_MS, 5000),
    isConfigured: Boolean(parsedEnv.DATABASE_URL || (parsedEnv.SQL_HOST && parsedEnv.SQL_USER && parsedEnv.SQL_PASSWORD && parsedEnv.SQL_DB_NAME)),
  },
  stripe: { secretKey: parsedEnv.STRIPE_SECRET_KEY, webhookSecret: parsedEnv.STRIPE_WEBHOOK_SECRET },
  gemini: { apiKey: parsedEnv.GEMINI_API_KEY },
  firebase: { serviceAccountKey: parsedEnv.FIREBASE_SERVICE_ACCOUNT_KEY, googleApplicationCredentials: parsedEnv.GOOGLE_APPLICATION_CREDENTIALS },
  ownerBootstrap: { initialOwnerEmail: parsedEnv.SPR_INITIAL_OWNER_EMAIL, secret: parsedEnv.SPR_OWNER_BOOTSTRAP_SECRET, secretSha256: parsedEnv.SPR_OWNER_BOOTSTRAP_SECRET_SHA256 },
  sentry: { dsn: parsedEnv.SENTRY_DSN },
  redis: { url: parsedEnv.REDIS_URL, failOpen: false },
  monitoring: { enabledTenantIds: parseCsv(parsedEnv.MONITORING_ENABLED_TENANT_IDS) },
};

const configurationMetadata = [
  { name: 'NODE_ENV', category: 'development-only', description: 'Application runtime mode.', requiredInProduction: false },
  { name: 'PORT', category: 'optional', description: 'HTTP port for the server.', requiredInProduction: false },
  { name: 'APP_URL', category: 'requiredProduction', description: 'Public host URL for application callback and origin validation.', requiredInProduction: true },
  { name: 'APP_ALLOWED_ORIGINS', category: 'requiredProduction', description: 'Exact comma-separated list of browser origins allowed to call the API.', requiredInProduction: true },
  { name: 'ENFORCE_HTTPS', category: 'requiredProduction', description: 'Force HTTPS redirection in production.', requiredInProduction: true },
  { name: 'TRUST_PROXY', category: 'requiredProduction', description: 'Enable reverse proxy support when production is behind a TLS-terminating proxy.', requiredInProduction: true },
  { name: 'TRUST_PROXY_HOPS', category: 'requiredProduction', description: 'Exact number of trusted reverse-proxy hops used for client IP derivation.', requiredInProduction: true },
  { name: 'ALLOW_IFRAME', category: 'optional', description: 'Allow trusted iframe embedding when explicitly required.', requiredInProduction: false },
  { name: 'DATABASE_URL', category: 'requiredProduction', description: 'PostgreSQL connection string.', requiredInProduction: true },
  { name: 'SQL_HOST', category: 'legacyAlternative', description: 'PostgreSQL host when DATABASE_URL is not used.', requiredInProduction: false },
  { name: 'SQL_USER', category: 'legacyAlternative', description: 'PostgreSQL username when DATABASE_URL is not used.', requiredInProduction: false },
  { name: 'SQL_PASSWORD', category: 'legacyAlternative', description: 'PostgreSQL password when DATABASE_URL is not used.', requiredInProduction: false },
  { name: 'SQL_DB_NAME', category: 'legacyAlternative', description: 'PostgreSQL database name when DATABASE_URL is not used.', requiredInProduction: false },
  { name: 'STRIPE_SECRET_KEY', category: 'requiredProduction', description: 'Stripe server secret for billing.', requiredInProduction: true },
  { name: 'STRIPE_WEBHOOK_SECRET', category: 'requiredProduction', description: 'Stripe webhook signing secret.', requiredInProduction: true },
  { name: 'FIREBASE_SERVICE_ACCOUNT_KEY', category: 'requiredProduction', description: 'Firebase Admin service account credentials.', requiredInProduction: true },
  { name: 'GOOGLE_APPLICATION_CREDENTIALS', category: 'alternative', description: 'Filesystem path to Firebase Admin credentials.', requiredInProduction: false },
  { name: 'GEMINI_API_KEY', category: 'featureSpecific', description: 'Gemini API key for AI-powered features.', requiredInProduction: false },
  { name: 'SENTRY_DSN', category: 'optional', description: 'Sentry DSN for error reporting.', requiredInProduction: false },
  { name: 'REDIS_URL', category: 'requiredProduction', description: 'Redis URL for shared fail-closed rate limiting.', requiredInProduction: true },
] as const;

function hasTlsDatabaseConfig(): boolean {
  if (config.database.ssl) return true;
  if (!config.database.connectionString) return false;
  try {
    const parsed = new URL(config.database.connectionString);
    const sslMode = parsed.searchParams.get('sslmode')?.toLowerCase();
    return sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full';
  } catch {
    return false;
  }
}

function hasTlsRedisConfig(): boolean {
  if (!config.redis.url) return false;
  try {
    return new URL(config.redis.url).protocol === 'rediss:';
  } catch {
    return false;
  }
}