import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env.test'), override: false });

const testUrl = process.env.DATABASE_URL_TEST?.trim();

if (!testUrl) {
  throw new Error(
    'DATABASE_URL_TEST is required. It must point to a dedicated PostgreSQL test database.',
  );
}

const parsedTestUrl = new URL(testUrl);
const databaseName = parsedTestUrl.pathname.replace(/^\//, '').toLowerCase();

if (!databaseName.includes('test')) {
  throw new Error(
    `Refusing to run integration tests against database "${databaseName}". The database name must contain "test".`,
  );
}

if (process.env.DATABASE_URL) {
  const normalUrl = new URL(process.env.DATABASE_URL);
  if (
    normalUrl.hostname === parsedTestUrl.hostname &&
    normalUrl.port === parsedTestUrl.port &&
    normalUrl.pathname === parsedTestUrl.pathname
  ) {
    throw new Error(
      'DATABASE_URL_TEST must not point to the configured development database.',
    );
  }
}

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: testUrl,
  NODE_OPTIONS: [process.env.NODE_OPTIONS, '--experimental-vm-modules']
    .filter(Boolean)
    .join(' '),
};
const require = createRequire(import.meta.url);

function run(scriptPath: string, args: string[]) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    if (result.error) throw result.error;
    process.exit(result.status ?? 1);
  }
}

run(require.resolve('prisma/build/index.js'), ['migrate', 'deploy']);
run(join(dirname(require.resolve('jest/package.json')), 'bin', 'jest.js'), [
  '--config',
  './test/jest-integration.json',
  ...process.argv.slice(2),
]);
