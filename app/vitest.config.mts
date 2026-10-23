import { defineConfig } from 'vitest/config';
// Las pruebas son de Node puro (lógica y preflight); no heredan el tsconfig de Expo.
export default defineConfig({ esbuild: { tsconfigRaw: '{"compilerOptions":{"target":"es2022"}}' }, test: { include: ['tests/**/*.test.ts'] } });
