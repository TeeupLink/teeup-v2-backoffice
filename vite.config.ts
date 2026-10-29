/// <reference types="vitest/config" />
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  // 포트는 개발 서버에서만 쓴다. Docker 빌드(npm run build)는 .env 없이도 통과해야 한다.
  const adminPort = Number(env.VITE_ADMIN_PORT) || 3000;
  const backendPort = Number(env.VITE_BACKEND_PORT) || 7777;
  const apiTarget = env.VITE_API_BASE_URL || `http://localhost:${backendPort}`;
  const proxy = { '/api': { target: apiTarget, changeOrigin: true } };

  return {
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    server: { port: adminPort, host: true, proxy },
    preview: { port: adminPort, host: true, proxy },
    build: { outDir: 'dist', sourcemap: false },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
