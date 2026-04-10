import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_PORT = process.env.VITE_API_PORT || '3001'
const BACKEND =
  process.env.VITE_BACKEND_TARGET ||
  process.env.VITE_SERVER_URL ||
  process.env.VITE_BACKEND_URL ||
  `http://localhost:${API_PORT}`

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/auth': { target: BACKEND, changeOrigin: true },
      '/socket.io': { target: BACKEND, changeOrigin: true, ws: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/auth': { target: BACKEND, changeOrigin: true },
      '/socket.io': { target: BACKEND, changeOrigin: true, ws: true },
    },
  },
})