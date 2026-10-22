import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');
const RUNNER = join(process.cwd(), 'scripts', 'migrate.js');

function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

function runMigrations(databasePath: string): string {
  return execFileSync(process.execPath, [RUNNER, 'up'], {
    env: { ...process.env, DATABASE_PATH: databasePath },
    encoding: 'utf8',
  });
}

describe('versioned database migrations', () => {
  let workDir: string;
  let databasePath: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'migrations-test-'));
    databasePath = join(workDir, 'test.db');
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('has ordered, numbered migration files', () => {
    const files = listMigrationFiles();
    expect(files.length).toBeGreaterThan(0);

    const versions = files.map((name) => name.split('_')[0]);
    versions.forEach((version) => {
      expect(version).toMatch(/^\d{4}$/);
    });

    const sorted = [...versions].sort();
    expect(versions).toEqual(sorted);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('migrates a clean database successfully', () => {
    const output = runMigrations(databasePath);
    expect(output).toContain('applied');

    const files = listMigrationFiles();
    const secondRun = runMigrations(databasePath);
    expect(secondRun).toContain('up to date');
    expect(files.length).toBeGreaterThan(0);
  });
});
