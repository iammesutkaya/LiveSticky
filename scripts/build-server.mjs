/**
 * Build script for the Devvit Web server bundle.
 * Uses esbuild (via Vite's internal esbuild) to bundle src/server/index.ts -> dist/server/index.cjs
 */
import { build } from 'vite';
import path from 'path';
import { builtinModules } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// NOTE: These options must mirror the official @devvit/start server build
// (node_modules/@devvit/start/vite/index.js). In particular:
//   - commonjsOptions.ignoreDynamicRequires + inlineDynamicImports prevent the
//     "Plugin RPC malformed error - this may be due to a require() statement"
//     runtime error from the Devvit server actor.
//   - Node built-ins must stay external (the Devvit runtime provides them).
await build({
  ssr: {
    // Bundle all dependencies so the output runs without node_modules,
    // but keep Node built-ins external.
    noExternal: true,
    external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
  },
  build: {
    ssr: path.resolve(root, 'server/index.ts'),
    target: 'node22',
    outDir: path.resolve(root, 'dist/server'),
    emptyOutDir: true,
    minify: true,
    copyPublicDir: false,
    commonjsOptions: {
      ignoreDynamicRequires: true,
    },
    rollupOptions: {
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
        inlineDynamicImports: true,
      },
    },
    sourcemap: false,
  },
});

console.log('✅ Server bundle built: dist/server/index.cjs');
