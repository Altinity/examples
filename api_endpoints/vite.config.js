import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = 'https://antalya.demo.altinity.cloud:8443';

export default defineConfig({
  base: '/taxidemo/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
      }
    }
  },
  server: {
    host: true,
    proxy: Object.fromEntries(
      ['/rush-hour', '/tips', '/routes'].map(path => [path, { target, changeOrigin: true }])
    ),
  },
});
