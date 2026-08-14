import { describe, expect, it, vi } from 'vitest';
import { probeDatabase } from '../src/utils/health';

describe('database health probe', () => {
  it('reports connected only after a successful query', async () => {
    const query = vi.fn().mockResolvedValue([{ ok: 1 }]);
    await expect(probeDatabase(query, true, 25)).resolves.toEqual({
      db: 'connected',
      code: 'DB_CONNECTED'
    });
    expect(query).toHaveBeenCalledOnce();
  });

  it('reports misconfigured without invoking a client object', async () => {
    const query = vi.fn();
    await expect(probeDatabase(query, false, 25)).resolves.toEqual({
      db: 'unavailable',
      code: 'DB_MISCONFIGURED'
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('reports unavailable when an initialized client rejects', async () => {
    const query = vi.fn().mockRejectedValue(Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }));
    await expect(probeDatabase(query, true, 25)).resolves.toEqual({
      db: 'unavailable',
      code: 'DB_UNAVAILABLE'
    });
  });

  it('reports timeout when the query exceeds the bound', async () => {
    const query = vi.fn(() => new Promise(() => undefined));
    await expect(probeDatabase(query, true, 5)).resolves.toEqual({
      db: 'unavailable',
      code: 'DB_TIMEOUT'
    });
  });
});
