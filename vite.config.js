import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /api/delhivery/* to track.delhivery.com during local dev.
      // This mirrors the Vercel serverless function behaviour (api/delhivery.js).
      '/api/delhivery': {
        target: 'https://track.delhivery.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/delhivery/, ''),
      },
    },
  },
})
