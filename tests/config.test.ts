import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('configuration validation', () => {
  const originalEnv = { ...process.env };
  const setProductionSecurityDefaults = () => {
    process.env.APP_ALLOWED_ORIGINS = 'https://example.com';
    process.env.ENFORCE_HTTPS = 'true';
    process.env.TRUST_PROXY = 'true';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{}';
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
  };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.SKIP_DOTENV = 'true';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('parses development configuration and applies defaults', async () => {
    process.env.NODE_ENV = 'development';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.SQL_HOST = 'localhost';
    process.env.SQL_USER = 'postgres';
    process.env.SQL_PASSWORD = 'postgres';
    process.env.SQL_DB_NAME = 'testdb';
    process.env.GEMINI_API_KEY = 'test-key';
    const { config, validateConfiguration } = await import('../src/config.ts');
    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(3000);
    expect(config.appUrl).toBe('http://localhost:3000');
    expect(config.database.isConfigured).toBe(true);
    expect(config.gemini.apiKey).toBe('test-key');
    expect(config.redis.url).toBeUndefined();
    expect(() => validateConfiguration()).not.toThrow();
  });

  it('fails validation in production when APP_URL is missing', async () => {
    process.env.NODE_ENV = 'production';
    setProductionSecurityDefaults();
    process.env.SQL_HOST = 'localhost';
    process.env.SQL_USER = 'postgres';
    process.env.SQL_PASSWORD = 'postgres';
    process.env.SQL_DB_NAME = 'testdb';
    const { validateConfiguration } = await import('../src/config.ts');
    expect(() => validateConfiguration()).toThrow(/APP_URL/);
  });

  it('fails validation in production when database configuration is incomplete', async () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://example.com';
    setProductionSecurityDefaults();
    process.env.SQL_HOST = 'localhost';
    delete process.env.SQL_USER;
    delete process.env.SQL_PASSWORD;
    delete process.env.SQL_DB_NAME;
    const { validateConfiguration } = await import('../src/config.ts');
    expect(() => validateConfiguration()).toThrow(/DATABASE_URL or complete SQL_\* configuration/);
  });

  it('rejects invalid APP_URL formats during config parsing', async () => {
    process.env.NODE_ENV = 'development';
    process.env.APP_URL = 'not-a-url';
    await expect(import('../src/config.ts')).rejects.toThrow(/Invalid url/);
  });

  it('fails closed when required production security settings are missing', async () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://example.com';
    process.env.SQL_HOST = 'localhost';
    process.env.SQL_USER = 'postgres';
    process.env.SQL_PASSWORD = 'postgres';
    process.env.SQL_DB_NAME = 'testdb';
    const { validateConfiguration } = await import('../src/config.ts');
    expect(() => validateConfiguration()).toThrow(/REDIS_URL/);
  });
});
