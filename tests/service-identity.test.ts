import { describe, expect, it } from 'vitest';
import { buildServiceIdentity } from '../src/utils/service-identity.ts';

describe('production service identity', () => {
  it('returns only sanitized SPR API identity fields', () => {
    const result = buildServiceIdentity('production', 'abc123');
    expect(result).toEqual({
      service: 'SPR API',
      status: 'operational',
      environment: 'production',
      version: 'abc123'
    });
    expect(JSON.stringify(result)).not.toMatch(/Google AI Studio|credential|database|secret|token/i);
  });
});
