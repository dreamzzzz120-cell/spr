import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const configPath = path.resolve(process.cwd(), 'src/config.ts');
const nodeRunner = `import '${configPath.replaceAll('\\', '/')}';`;

function runWith(env: Record<string, string | undefined>) {
  const merged = { ...process.env, ...env, SKIP_DOTENV: 'true' };
  return execFileSync(process.execPath, ['--import', 'tsx', '--eval', nodeRunner], {
    env: merged,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

describe('production configuration fail-closed contract', () => {
  it('rejects production without shared Redis', () => {
    expect(() => runWith({
      NODE_ENV: 'production',
      APP_URL: 'https://spr.example',
      APP_ALLOWED_ORIGINS: 'https://spr.example',
      ENFORCE_HTTPS: 'true',
      TRUST_PROXY: 'true',
      DATABASE_URL: 'postgresql://u:p@example/db',
      FIREBASE_SERVICE_ACCOUNT_KEY: '{}',
      STRIPE_SECRET_KEY: 'sk_test_placeholder',
      STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
      REDIS_URL: undefined,
    })).toThrow(/REDIS_URL/);
  });

  it('rejects explicit fail-open rate limiting in production', () => {
    expect(() => runWith({
      NODE_ENV: 'production',
      APP_URL: 'https://spr.example',
      APP_ALLOWED_ORIGINS: 'https://spr.example',
      ENFORCE_HTTPS: 'true',
      TRUST_PROXY: 'true',
      DATABASE_URL: 'postgresql://u:p@example/db',
      FIREBASE_SERVICE_ACCOUNT_KEY: '{}',
      STRIPE_SECRET_KEY: 'sk_test_placeholder',
      STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
      REDIS_URL: 'redis://localhost:6379',
      RATE_LIMIT_FAIL_OPEN: 'true',
    })).toThrow(/RATE_LIMIT_FAIL_OPEN/);
  });
});
