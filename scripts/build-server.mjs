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
  configFile: false,
  build: {
    lib: {
      entry: path.resolve(root, 'server/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
    outDir: path.resolve(root, 'dist/server'),
    emptyOutDir: true,
    rollupOptions: {
      external: [
        '@devvit/web/server',
        '@devvit/web/client',
        /^@devvit\//,
      ],
    },
    minify: false,
    sourcemap: false,
  },
});

console.log('✅ Server bundle built: dist/server/index.cjs');
