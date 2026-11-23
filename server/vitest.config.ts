import { defineConfig } from 'vitest/config';

// PGlite sobe um Postgres por teste e o scrypt é lento de propósito.
export default defineConfig({ test: { testTimeout: 30_000 } });
