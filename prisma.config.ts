import { defineConfig, env } from 'prisma/config';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
