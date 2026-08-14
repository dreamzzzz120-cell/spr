import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  inspectTree,
  downloadArchive,
  generateRepositorySbom,
  normalizeCycloneDx,
  runBounded,
  validateArchiveEntries,
} from '../src/workers/osv-worker.ts';
import { createRepositoryScanSchema } from '../src/middleware/validation.ts';
import {
  findDuplicateActiveRepositoryScan,
  REPOSITORY_SCANNER_CONFIGURATION,
} from '../src/utils/repository-scan.ts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory =>
    rm(directory, { recursive: true, force: true })
  ));
});

describe('repository scan request boundary', () => {
  it('accepts structured GitHub coordinates without a local path or credential', () => {
    const result = createRepositoryScanSchema.safeParse({
      provider: 'github',
      owner: 'example',
      repository: 'project',
      ref: 'main',
      subdirectory: 'apps/api',
      connectionId: 'connection-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects path traversal and secret-bearing extra fields', () => {
    expect(createRepositoryScanSchema.safeParse({
      provider: 'github',
      owner: 'example',
      repository: 'project',
      subdirectory: '../../outside',
      connectionId: 'connection-1',
    }).success).toBe(false);
    expect(createRepositoryScanSchema.safeParse({
      provider: 'github',
      owner: 'example',
      repository: 'project',
      connectionId: 'connection-1',
      accessToken: 'must-not-be-accepted',
    }).success).toBe(false);
  });

  it('detects an active scan by requested ref or its resolved immutable SHA', () => {
    const source = {
      requestedRef: 'main',
      resolvedCommitSha: 'a'.repeat(40),
      scannerConfiguration: REPOSITORY_SCANNER_CONFIGURATION,
      jobId: 'active-job',
    };
    const active = new Set(['active-job']);
    expect(findDuplicateActiveRepositoryScan([source], active, 'main')?.jobId).toBe('active-job');
    expect(findDuplicateActiveRepositoryScan([source], active, 'a'.repeat(40))?.jobId).toBe('active-job');
    expect(findDuplicateActiveRepositoryScan([source], new Set(), 'main')).toBeUndefined();
    expect(findDuplicateActiveRepositoryScan(
      [source],
      active,
      'main',
      'different-scanner-configuration',
    )).toBeUndefined();
  });
});

describe('safe manifest discovery', () => {
  it('discovers nested and monorepo manifests while ignoring dependency/build trees', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'spr-manifest-test-'));
    temporaryDirectories.push(root);
    await mkdir(path.join(root, 'apps', 'api'), { recursive: true });
    await mkdir(path.join(root, 'packages', 'web'), { recursive: true });
    await mkdir(path.join(root, 'node_modules', 'ignored'), { recursive: true });
    await mkdir(path.join(root, 'dist'), { recursive: true });
    await writeFile(path.join(root, 'apps', 'api', 'requirements.txt'), 'flask==3.0.0');
    await writeFile(path.join(root, 'packages', 'web', 'package.json'), '{}');
    await writeFile(path.join(root, 'packages', 'web', 'package-lock.json'), '{}');
    await writeFile(path.join(root, 'node_modules', 'ignored', 'package.json'), '{}');
    await writeFile(path.join(root, 'dist', 'package.json'), '{}');

    await expect(inspectTree(root)).resolves.toEqual([
      'apps/api/requirements.txt',
      'packages/web/package-lock.json',
      'packages/web/package.json',
    ]);
  });

  it('fails closed when no supported manifest exists', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'spr-no-manifest-test-'));
    temporaryDirectories.push(root);
    await writeFile(path.join(root, 'README.md'), 'No dependency manifest');
    await expect(inspectTree(root)).rejects.toThrow('NO_SUPPORTED_MANIFESTS');
  });

  it('rejects archive traversal and absolute entries', () => {
    expect(() => validateArchiveEntries(['root/package.json', '../escape'])).toThrow('REPOSITORY_PATH_INVALID');
    expect(() => validateArchiveEntries(['C:/escape'])).toThrow('REPOSITORY_PATH_INVALID');
  });
});

async function withHttpServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  run: (url: string) => Promise<void>,
) {
  const server = createServer(handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('TEST_SERVER_ADDRESS_FAILED');
  try {
    await run(`http://127.0.0.1:${address.port}/archive`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close(error => error ? reject(error) : resolve())
    );
  }
}

describe('bounded repository archive acquisition', () => {
  it('enforces the acquisition timeout', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'spr-timeout-test-'));
    temporaryDirectories.push(root);
    await withHttpServer((_request, response) => {
      setTimeout(() => response.end('late archive'), 250);
    }, async url => {
      await expect(downloadArchive(url, path.join(root, 'archive.zip'), {
        timeoutMs: 25,
      })).rejects.toThrow('REPOSITORY_ACQUISITION_TIMEOUT');
    });
  });

  it('rejects an archive whose declared or streamed size exceeds the bound', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'spr-oversize-test-'));
    temporaryDirectories.push(root);
    await withHttpServer((_request, response) => {
      response.setHeader('content-length', '1024');
      response.end(Buffer.alloc(1024));
    }, async url => {
      await expect(downloadArchive(url, path.join(root, 'archive.zip'), {
        maxBytes: 128,
      })).rejects.toThrow('REPOSITORY_TOO_LARGE');
    });
  });

  it('acquires an archive with only a nested manifest and preserves its path', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'spr-nested-archive-test-'));
    temporaryDirectories.push(root);
    const source = path.join(root, 'fixture-root');
    await mkdir(path.join(source, 'apps', 'api'), { recursive: true });
    await writeFile(path.join(source, 'README.md'), 'root has no manifest');
    await writeFile(path.join(source, 'apps', 'api', 'package.json'), '{"name":"nested","version":"1.0.0"}');
    const archive = path.join(root, 'fixture.zip');
    const tar = process.platform === 'win32' ? 'tar.exe' : 'tar';
    expect((await runBounded(tar, ['-a', '-cf', archive, '-C', root, 'fixture-root'], 10_000)).code).toBe(0);
    const bytes = await readFile(archive);
    await withHttpServer((_request, response) => response.end(bytes), async url => {
      const downloaded = path.join(root, 'downloaded.zip');
      const extracted = path.join(root, 'extracted');
      await mkdir(extracted);
      await downloadArchive(url, downloaded);
      expect((await runBounded(tar, ['-xf', downloaded, '-C', extracted], 10_000)).code).toBe(0);
      await expect(inspectTree(path.join(extracted, 'fixture-root'))).resolves.toEqual([
        'apps/api/package.json',
      ]);
    });
  });

  it('acquires a monorepo archive and discovers multiple nested manifests', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'spr-monorepo-archive-test-'));
    temporaryDirectories.push(root);
    const source = path.join(root, 'fixture-root');
    await mkdir(path.join(source, 'apps', 'api'), { recursive: true });
    await mkdir(path.join(source, 'packages', 'web'), { recursive: true });
    await writeFile(path.join(source, 'package.json'), '{"name":"workspace","version":"1.0.0"}');
    await writeFile(path.join(source, 'apps', 'api', 'requirements.txt'), 'flask==3.0.0');
    await writeFile(path.join(source, 'packages', 'web', 'package.json'), '{"name":"web","version":"1.0.0"}');
    const archive = path.join(root, 'fixture.zip');
    const tar = process.platform === 'win32' ? 'tar.exe' : 'tar';
    expect((await runBounded(tar, ['-a', '-cf', archive, '-C', root, 'fixture-root'], 10_000)).code).toBe(0);
    const bytes = await readFile(archive);
    await withHttpServer((_request, response) => response.end(bytes), async url => {
      const downloaded = path.join(root, 'downloaded.zip');
      const extracted = path.join(root, 'extracted');
      await mkdir(extracted);
      await downloadArchive(url, downloaded);
      expect((await runBounded(tar, ['-xf', downloaded, '-C', extracted], 10_000)).code).toBe(0);
      await expect(inspectTree(path.join(extracted, 'fixture-root'))).resolves.toEqual([
        'apps/api/requirements.txt',
        'package.json',
        'packages/web/package.json',
      ]);
    });
  });
});

describe('CycloneDX validation and normalization', () => {
  it('retains versions and purls and deterministically removes duplicates', () => {
    const normalized = normalizeCycloneDx({
      bomFormat: 'CycloneDX',
      components: [
        { name: 'lodash', version: '4.17.20', purl: 'pkg:npm/lodash@4.17.20' },
        { name: 'lodash', version: '4.17.20', purl: 'pkg:npm/lodash@4.17.20' },
      ],
    });
    expect(normalized).toEqual([{
      name: 'lodash',
      version: '4.17.20',
      ecosystem: 'npm',
      purl: 'pkg:npm/lodash@4.17.20',
    }]);
  });

  it('retains an unknown version as unknown and rejects invalid or empty SBOMs', () => {
    expect(normalizeCycloneDx({
      bomFormat: 'CycloneDX',
      components: [{ name: 'unknown-package', purl: 'pkg:generic/unknown-package' }],
    })[0]).not.toHaveProperty('version');
    expect(() => normalizeCycloneDx({ components: [] })).toThrow('SBOM_INVALID');
    expect(() => normalizeCycloneDx({ bomFormat: 'CycloneDX', components: [] })).toThrow('SBOM_EMPTY');
    expect(() => normalizeCycloneDx({
      bomFormat: 'CycloneDX',
      components: [{ name: '' }],
    })).toThrow('SBOM_INVALID');
  });
});

describe('repository-path SBOM generator failures', () => {
  it('maps invalid generated JSON to SBOM_INVALID', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'spr-invalid-sbom-test-'));
    temporaryDirectories.push(root);
    const script = path.join(root, 'fake-syft.mjs');
    await writeFile(script, `
      if (process.argv.includes('version')) console.log(JSON.stringify({version:'1.49.0'}));
      else console.log('not-json');
    `);
    await expect(generateRepositorySbom(root, process.execPath, {
      executableArgsPrefix: [script],
    })).rejects.toThrow('SBOM_INVALID');
  });

  it('maps a valid empty CycloneDX document to SBOM_EMPTY', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'spr-empty-sbom-test-'));
    temporaryDirectories.push(root);
    const script = path.join(root, 'fake-syft.mjs');
    await writeFile(script, `
      if (process.argv.includes('version')) console.log(JSON.stringify({version:'1.49.0'}));
      else console.log(JSON.stringify({bomFormat:'CycloneDX',components:[]}));
    `);
    await expect(generateRepositorySbom(root, process.execPath, {
      executableArgsPrefix: [script],
    })).rejects.toThrow('SBOM_EMPTY');
  });

  it('enforces the repository-path SBOM generation timeout', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'spr-sbom-timeout-test-'));
    temporaryDirectories.push(root);
    const script = path.join(root, 'fake-syft.mjs');
    await writeFile(script, `
      if (process.argv.includes('version')) console.log(JSON.stringify({version:'1.49.0'}));
      else setTimeout(() => console.log('{}'), 500);
    `);
    await expect(generateRepositorySbom(root, process.execPath, {
      executableArgsPrefix: [script],
      timeoutMs: 25,
    })).rejects.toThrow('SBOM_GENERATION_TIMEOUT');
  });
});
