import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [vue()],
    resolve: {
      alias: { '@': resolve(__dirname, 'src') }
    },
    base: env.VITE_BASE_URL || '/',
    server: {
      port: 8089,
      proxy: {
        '/api': { target: 'http://localhost:8083', changeOrigin: true },
        '/wr':  { target: 'http://localhost:8083', changeOrigin: true }
      }
    }
  }
})
