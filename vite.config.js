import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // listen on 0.0.0.0 so other devices on the same LAN can reach the dev server
    // Honour a PORT from the environment when one is set (tooling that assigns
    // a free port, container port mapping); falls back to Vite's default 5173
    // for a plain `npm run dev`.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
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
