import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'https://mycluster.myenv.altinity.cloud:8443',
        changeOrigin: true,
        secure: false, // This ignores SSL certificate errors
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
