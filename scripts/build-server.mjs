/**
 * Build script for the Devvit Web server bundle.
 * Uses esbuild (via Vite's internal esbuild) to bundle src/server/index.ts -> dist/server/index.cjs
 */
import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

await build({
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: path.resolve(root, 'server/index.ts'),
    target: 'node22',
    outDir: path.resolve(root, 'dist/server'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
      },
    },
    minify: false,
    sourcemap: false,
  },
});

console.log('✅ Server bundle built: dist/server/index.cjs');
