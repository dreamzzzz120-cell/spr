import { describe, expect, it, vi } from 'vitest';
import { probeDatabase } from '../src/utils/health';

describe('health readiness utility', () => {
  it('reports DB_MISCONFIGURED when not configured', async () => {
    const query = vi.fn();

    await expect(probeDatabase(query, false, 25)).resolves.toEqual({
      db: 'unavailable',
      code: 'DB_MISCONFIGURED'
    });

    expect(query).not.toHaveBeenCalled();
  });

  it('performs the real query when configured', async () => {
    const query = vi.fn().mockResolvedValue([{ 1: 1 }]);

    await expect(probeDatabase(query, true, 25)).resolves.toEqual({
      db: 'connected',
      code: 'DB_CONNECTED'
    });

    expect(query).toHaveBeenCalledOnce();
  });
});
