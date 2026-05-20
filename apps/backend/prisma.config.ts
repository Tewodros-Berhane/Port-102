import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

const envFilePaths = [
  join(process.cwd(), '.env'),
  join(process.cwd(), '../../.env'),
  join(process.cwd(), '.env.example'),
  join(process.cwd(), '../../.env.example'),
];

for (const path of envFilePaths) {
  if (existsSync(path)) {
    loadEnv({ path, override: false });
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
