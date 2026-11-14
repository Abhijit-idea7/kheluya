import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
// Build stamp (India time) shown in the admin header, to confirm which version is live.
const BUILD_STAMP = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 16).replace('T', ' ');
// Unique id of this build. Also written to /version.json, so a page left open can tell a newer version is live.
const BUILD_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export default defineConfig({
  define: { __BUILD_STAMP__: JSON.stringify(BUILD_STAMP), __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    react(),
    {
      name: 'ck-version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: BUILD_ID, built: BUILD_STAMP }) });
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
