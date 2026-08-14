/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import { z } from 'zod';

if (process.env.SKIP_DOTENV !== 'true') {
  dotenv.config();
}

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

const positiveIntegerString = z.string().regex(/^[1-9][0-9]*$/, 'Must be a positive integer');
const optionalPositiveIntegerString = z.optional(positiveIntegerString);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  PORT: optionalPositiveIntegerString,
  APP_URL: optionalTrimmedUrl,
  APP_ALLOWED_ORIGINS: optionalTrimmedString,
  ENFORCE_HTTPS: optionalBooleanString,
  TRUST_PROXY: optionalBooleanString,
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

const parseCsv = (input: string | undefined) => {
  if (!input) return [];
  return input.split(',').map((item) => item.trim()).filter(Boolean);
};

const parsedEnv = envSchema.parse(process.env);

export const config = {
  nodeEnv: parsedEnv.NODE_ENV ?? 'development',
  port: parsedEnv.PORT ? Number(parsedEnv.PORT) : 3000,
  isProduction: parsedEnv.NODE_ENV === 'production',
  appUrl: parsedEnv.APP_URL,
  allowedOrigins: parseCsv(parsedEnv.APP_ALLOWED_ORIGINS),
  enforceHttps: parseBoolean(parsedEnv.ENFORCE_HTTPS, false),
  trustProxy: parseBoolean(parsedEnv.TRUST_PROXY, false),
  allowIframe: parseBoolean(parsedEnv.ALLOW_IFRAME, false),
  database: {
    connectionString: parsedEnv.DATABASE_URL,
    host: parsedEnv.SQL_HOST,
    user: parsedEnv.SQL_USER,
    password: parsedEnv.SQL_PASSWORD,
    name: parsedEnv.SQL_DB_NAME,
    ssl: parsedEnv.SQL_SSL ? ['true', 'require'].includes(parsedEnv.SQL_SSL.toLowerCase()) : false,
    poolMax: parseNumber(parsedEnv.SQL_POOL_MAX, 20),
    connectionTimeoutMs: parseNumber(parsedEnv.SQL_CONNECTION_TIMEOUT_MS, 10000),
    idleTimeoutMs: parseNumber(parsedEnv.SQL_IDLE_TIMEOUT_MS, 30000),
    queryTimeoutMs: parseNumber(parsedEnv.SQL_QUERY_TIMEOUT_MS, 5000),
    isConfigured: Boolean(parsedEnv.DATABASE_URL || (parsedEnv.SQL_HOST && parsedEnv.SQL_USER && parsedEnv.SQL_PASSWORD && parsedEnv.SQL_DB_NAME)),
  },
  stripe: {
    secretKey: parsedEnv.STRIPE_SECRET_KEY,
    webhookSecret: parsedEnv.STRIPE_WEBHOOK_SECRET,
  },
  gemini: {
    apiKey: parsedEnv.GEMINI_API_KEY,
  },
  firebase: {
    serviceAccountKey: parsedEnv.FIREBASE_SERVICE_ACCOUNT_KEY,
    googleApplicationCredentials: parsedEnv.GOOGLE_APPLICATION_CREDENTIALS,
  },
  ownerBootstrap: {
    initialOwnerEmail: parsedEnv.SPR_INITIAL_OWNER_EMAIL,
    secret: parsedEnv.SPR_OWNER_BOOTSTRAP_SECRET,
    secretSha256: parsedEnv.SPR_OWNER_BOOTSTRAP_SECRET_SHA256,
  },
  sentry: {
    dsn: parsedEnv.SENTRY_DSN,
  },
  redis: {
    url: parsedEnv.REDIS_URL,
    // Default to fail-CLOSED in production: if Redis is unreachable, sensitive endpoints
    // (auth, billing, etc.) should reject requests rather than silently rate-limit
    // per-instance in memory, which weakens the effective limit under an outage.
    // Set RATE_LIMIT_FAIL_OPEN=true to restore the old fail-open behavior.
    failOpen: parsedEnv.RATE_LIMIT_FAIL_OPEN === 'true' || parsedEnv.RATE_LIMIT_FAIL_OPEN === '1',
  },
  monitoring: {
    enabledTenantIds: parseCsv(parsedEnv.MONITORING_ENABLED_TENANT_IDS),
  },
};

const configurationMetadata = [
  { name: 'NODE_ENV', category: 'development-only', description: 'Application runtime mode.', requiredInProduction: false },
  { name: 'PORT', category: 'optional', description: 'HTTP port for the server.', requiredInProduction: false },
  { name: 'APP_URL', category: 'requiredProduction', description: 'Public host URL for application callback and origin validation.', requiredInProduction: true },
  { name: 'APP_ALLOWED_ORIGINS', category: 'optional', description: 'Comma-separated list of allowed CORS origins.', requiredInProduction: false },
  { name: 'ENFORCE_HTTPS', category: 'optional', description: 'Force HTTPS redirection in production.', requiredInProduction: false },
  { name: 'TRUST_PROXY', category: 'optional', description: 'Enable reverse proxy support for secure headers.', requiredInProduction: false },
  { name: 'ALLOW_IFRAME', category: 'optional', description: 'Allow trusted iframe embedding when true.', requiredInProduction: false },
  { name: 'SQL_HOST', category: 'requiredProduction', description: 'PostgreSQL host URL or address.', requiredInProduction: true },
  { name: 'SQL_USER', category: 'requiredProduction', description: 'PostgreSQL username.', requiredInProduction: true },
  { name: 'SQL_PASSWORD', category: 'requiredProduction', description: 'PostgreSQL password.', requiredInProduction: true },
  { name: 'SQL_DB_NAME', category: 'requiredProduction', description: 'PostgreSQL database name.', requiredInProduction: true },
  { name: 'DATABASE_URL', category: 'optional', description: 'PostgreSQL connection string.', requiredInProduction: false },
  { name: 'SQL_SSL', category: 'optional', description: 'Enable SSL for PostgreSQL connections.', requiredInProduction: false },
  { name: 'SQL_POOL_MAX', category: 'optional', description: 'Maximum PostgreSQL connection pool size.', requiredInProduction: false },
  { name: 'SQL_CONNECTION_TIMEOUT_MS', category: 'optional', description: 'PostgreSQL connection establishment timeout in milliseconds.', requiredInProduction: false },
  { name: 'SQL_IDLE_TIMEOUT_MS', category: 'optional', description: 'PostgreSQL idle connection timeout in milliseconds.', requiredInProduction: false },
  { name: 'SQL_QUERY_TIMEOUT_MS', category: 'optional', description: 'PostgreSQL query timeout in milliseconds.', requiredInProduction: false },
  { name: 'STRIPE_SECRET_KEY', category: 'featureSpecific', description: 'Stripe API secret key for billing integration.', requiredInProduction: false },
  { name: 'STRIPE_WEBHOOK_SECRET', category: 'featureSpecific', description: 'Stripe webhook signing secret.', requiredInProduction: false },
  { name: 'GEMINI_API_KEY', category: 'featureSpecific', description: 'Gemini API key for AI-powered features.', requiredInProduction: false },
  { name: 'FIREBASE_SERVICE_ACCOUNT_KEY', category: 'featureSpecific', description: 'Firebase service account JSON credentials.', requiredInProduction: false },
  { name: 'GOOGLE_APPLICATION_CREDENTIALS', category: 'featureSpecific', description: 'Path to Firebase service account JSON file.', requiredInProduction: false },
  { name: 'SPR_INITIAL_OWNER_EMAIL', category: 'bootstrap-only', description: 'Exact verified Firebase email eligible for the one-time initial Owner bootstrap. Inject from Secret Manager.', requiredInProduction: false },
  { name: 'SPR_OWNER_BOOTSTRAP_SECRET', category: 'bootstrap-only', description: 'One-time initial Owner bootstrap gate. Inject from Secret Manager and never expose to clients.', requiredInProduction: false },
  { name: 'SPR_OWNER_BOOTSTRAP_SECRET_SHA256', category: 'bootstrap-only', description: 'SHA-256 verifier for SPR_OWNER_BOOTSTRAP_SECRET. Inject from Secret Manager and never expose to clients.', requiredInProduction: false },
  { name: 'SENTRY_DSN', category: 'optional', description: 'Sentry DSN for error reporting.', requiredInProduction: false },
  { name: 'REDIS_URL', category: 'optional', description: 'Redis connection URL for rate limiting and caching.', requiredInProduction: false },
  { name: 'MONITORING_ENABLED_TENANT_IDS', category: 'featureSpecific', description: 'Comma-separated tenant IDs allowed to access monitoring endpoints.', requiredInProduction: false },
] as const;

export function validateConfiguration() {
  const issues: string[] = [];

  if (config.isProduction) {
    const missingRequired: string[] = [];
    if (!config.appUrl) missingRequired.push('APP_URL');
    if (!config.database.isConfigured) {
      missingRequired.push('SQL_HOST', 'SQL_USER', 'SQL_PASSWORD', 'SQL_DB_NAME');
    }

    if (missingRequired.length > 0) {
      throw new Error(
        `Missing required production environment configuration: ${[...new Set(missingRequired)].join(', ')}.`
      );
    }
  }

  if (config.isProduction && !config.sentry.dsn) {
    issues.push('[Configuration Warning] SENTRY_DSN is not configured. Production error reporting is disabled.');
  }

  if (config.isProduction && !config.redis.url) {
    issues.push('[Configuration Warning] REDIS_URL is not configured. Rate limiting will fall back to in-memory mode if Redis is unavailable.');
  }

  if (config.isProduction && !config.gemini.apiKey) {
    issues.push('[Configuration Warning] GEMINI_API_KEY is not configured. Gemini AI endpoints will remain unavailable.');
  }

  if (config.isProduction && !config.firebase.serviceAccountKey && !config.firebase.googleApplicationCredentials) {
    issues.push('[Configuration Warning] Firebase admin credentials are not configured. Firebase admin operations may be unavailable.');
  }

  if (config.isProduction && [config.ownerBootstrap.initialOwnerEmail, config.ownerBootstrap.secret, config.ownerBootstrap.secretSha256].some(Boolean) && ![config.ownerBootstrap.initialOwnerEmail, config.ownerBootstrap.secret, config.ownerBootstrap.secretSha256].every(Boolean)) {
    issues.push('[Configuration Warning] Initial Owner bootstrap is disabled because SPR_INITIAL_OWNER_EMAIL, SPR_OWNER_BOOTSTRAP_SECRET, and SPR_OWNER_BOOTSTRAP_SECRET_SHA256 are all required.');
  }

  if (config.isProduction && !config.stripe.secretKey) {
    issues.push('[Configuration Warning] STRIPE_SECRET_KEY is not configured. Billing and checkout endpoints will return 503.');
  }

  if (config.isProduction && !config.stripe.webhookSecret) {
    issues.push('[Configuration Warning] STRIPE_WEBHOOK_SECRET is not configured. Stripe webhook handling may be disabled.');
  }

  issues.forEach((issue) => console.warn(issue));
}

export const configurationCatalog = configurationMetadata.map((entry) => ({
  name: entry.name,
  category: entry.category,
  description: entry.description,
  requiredInProduction: entry.requiredInProduction,
}));
