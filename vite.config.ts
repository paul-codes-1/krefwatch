/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Stamped into every /data/*.json request as ?v=<build-id> so a CDN in front
  // (Cloudflare honors Amplify's one-year s-maxage) can never serve a previous
  // deploy's JSON to the new bundle. See src/lib/api.ts.
  define: { __BUILD_ID__: JSON.stringify(String(Date.now())) },
  server: {
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
