import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

const api = process.env.VITE_API_PROXY ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@hsrp/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts') } },
  server: {
    port: 5175,
    proxy: { '/api': api, '/mock-gateway': api },
  },
});
