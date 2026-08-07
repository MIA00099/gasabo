import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      ignored: ['**/dist/**'],
    },
    proxy: {
      // Forward API calls to the Express backend (npm run server) during dev,
      // so the frontend can just call fetch('/api/...') with no CORS/base-URL setup.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
