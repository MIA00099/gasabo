import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // listen on 0.0.0.0 so other devices on the same LAN can reach the dev server
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
      // Uploaded product photos are served from the backend too.
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
