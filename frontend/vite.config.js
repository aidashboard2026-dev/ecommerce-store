import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const proxyTarget =
    env.VITE_PROXY_TARGET ||
    (env.DOCKER === 'true'
      ? 'http://backend:8000'
      : 'http://localhost:8000')

  return {
    plugins: [react()],

    server: {
      host: '0.0.0.0',
      port: 5173,

      hmr: {
        host: 'localhost',
        clientPort: 5173,
      },

      watch: {
        usePolling: true,
        interval: 100,
      },

      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },

        '/health': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})