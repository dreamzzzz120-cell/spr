import { describe, expect, it } from 'vitest';
import crypto from 'crypto';
import {
  bootstrapInitialOwner,
  OwnerBootstrapDeniedError,
  type FirebaseUser,
  type OwnerBootstrapAuth,
  type OwnerBootstrapStore,
} from '../src/utils/initial-owner-bootstrap.ts';

class FakeStore implements OwnerBootstrapStore {
  owner = false;
  promotions = 0;
  audits = 0;
  private tail: Promise<void> = Promise.resolve();

  async withExclusiveLock<T>(operation: (lockedStore: OwnerBootstrapStore) => Promise<T>): Promise<T> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => { release = resolve; });
    const previous = this.tail;
    this.tail = next;
    await previous;
    try {
      return await operation(this);
    } finally {
      release();
    }
  }

  async ownerExists() { return this.owner; }
  async createOrPromoteInitialOwner() { this.owner = true; this.promotions += 1; }
  async recordBootstrapAudit() { this.audits += 1; }
}

const verifiedUser: FirebaseUser = {
  uid: 'firebase-owner-uid',
  email: 'owner@example.test',
  emailVerified: true,
  customClaims: { role: 'Viewer', workspaceId: 'tenant-viewer' },
};

const createAuth = (user: FirebaseUser = verifiedUser): OwnerBootstrapAuth & { claims: Record<string, unknown>[] } => ({
  claims: [],
  async getUserByEmail() { return user; },
  async setCustomUserClaims(_uid, claims) { this.claims.push(claims); },
});

const input = {
  initialOwnerEmail: 'owner@example.test',
  bootstrapSecret: 'secret-from-server-only-store',
  bootstrapSecretSha256: crypto.createHash('sha256').update('secret-from-server-only-store').digest('hex'),
};

describe('initial Owner bootstrap', () => {
  it('rejects an unconfigured bootstrap identity or secret', async () => {
    await expect(bootstrapInitialOwner({}, createAuth(), new FakeStore())).rejects.toBeInstanceOf(OwnerBootstrapDeniedError);
    await expect(bootstrapInitialOwner({ initialOwnerEmail: input.initialOwnerEmail, bootstrapSecret: input.bootstrapSecret }, createAuth(), new FakeStore())).rejects.toBeInstanceOf(OwnerBootstrapDeniedError);
  });

  it('rejects a wrong bootstrap secret', async () => {
    await expect(bootstrapInitialOwner({ ...input, bootstrapSecret: 'wrong-secret' }, createAuth(), new FakeStore())).rejects.toBeInstanceOf(OwnerBootstrapDeniedError);
  });

  it('rejects an unverified Firebase email', async () => {
    await expect(bootstrapInitialOwner(input, createAuth({ ...verifiedUser, emailVerified: false }), new FakeStore())).rejects.toBeInstanceOf(OwnerBootstrapDeniedError);
  });

  it('rejects an email that does not exactly match the configured identity', async () => {
    await expect(bootstrapInitialOwner(input, createAuth({ ...verifiedUser, email: 'other@example.test' }), new FakeStore())).rejects.toBeInstanceOf(OwnerBootstrapDeniedError);
  });

  it('creates exactly one Owner and server-side Owner claims for the authorized identity', async () => {
    const store = new FakeStore();
    const auth = createAuth();
    await expect(bootstrapInitialOwner(input, auth, store)).resolves.toMatchObject({ tenantId: expect.stringMatching(/^tenant-/) });
    expect(store.promotions).toBe(1);
    expect(store.audits).toBe(1);
    expect(auth.claims).toHaveLength(1);
    expect(auth.claims[0]).toMatchObject({ role: 'Owner' });
  });

  it('rejects a second bootstrap after an Owner exists', async () => {
    const store = new FakeStore();
    await bootstrapInitialOwner(input, createAuth(), store);
    await expect(bootstrapInitialOwner(input, createAuth(), store)).rejects.toBeInstanceOf(OwnerBootstrapDeniedError);
  });

  it('allows only one of two simultaneous bootstrap attempts', async () => {
    const store = new FakeStore();
    const results = await Promise.allSettled([
      bootstrapInitialOwner(input, createAuth(), store),
      bootstrapInitialOwner(input, createAuth(), store),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(store.promotions).toBe(1);
  });
});
