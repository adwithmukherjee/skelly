import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    tsconfig: './tsconfig.build.json',
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['@skelly/repositories', '@skelly/types', '@skelly/utils'],
});