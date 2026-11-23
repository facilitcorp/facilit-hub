import { defineConfig } from 'vitest/config';

// PGlite sobe um Postgres por teste; o scrypt fica barato aqui (em produção é ignorado).
export default defineConfig({ test: { testTimeout: 30_000, env: { HUB_SCRYPT_N: '1024' } } });
