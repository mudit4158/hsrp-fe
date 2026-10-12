import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

// The API (hsrp-dms-be) in development. Docker serves the build through nginx instead (see nginx.conf.template).
const api = process.env.VITE_API_PROXY ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  // Shared request/response types are a synced copy of the backend's contracts (scripts/sync-contracts.mjs).
  resolve: { alias: { '@hsrp/contracts': path.resolve(__dirname, 'src/contracts/index.ts') } },
  server: {
    port: 5175,
    proxy: { '/api': api, '/mock-gateway': api },
  },
});
