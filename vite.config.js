import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During dev, /run is forwarded to the local Cloudflare Worker (wrangler dev on
// :8798) so the Claude API call happens server-side, never from the browser.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    // 5173 is commonly taken by other local projects; PORT still wins when the
    // launcher assigns one.
    port: Number(process.env.PORT) || 5183,
    proxy: { '/run': 'http://localhost:8798' },
  },
})
