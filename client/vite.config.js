import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: /api → Express server on PORT 5000 (or PORT env).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});