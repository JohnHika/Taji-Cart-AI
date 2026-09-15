import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const API_PORT = process.env.VITE_API_PORT || '3001'
const BACKEND =
  process.env.VITE_BACKEND_TARGET ||
  process.env.VITE_SERVER_URL ||
  process.env.VITE_BACKEND_URL ||
  `http://localhost:${API_PORT}`

// Identifies exactly which deploy is running in a given browser tab.
// VERCEL_GIT_COMMIT_SHA is set automatically by Vercel's build environment;
// falls back to a timestamp for local builds where it isn't set.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`

// Writes dist/version.json (unhashed, so it's always fetched fresh — unlike
// the content-hashed JS chunks) so an already-loaded tab can poll for it and
// detect that a newer deploy has shipped. See src/App.jsx's version watcher.
const emitVersionFile = () => ({
  name: 'emit-version-file',
  writeBundle(options) {
    fs.writeFileSync(
      path.join(options.dir, 'version.json'),
      JSON.stringify({ buildId: BUILD_ID }),
    )
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), emitVersionFile()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  optimizeDeps: {
    include: ['exceljs'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux':   ['@reduxjs/toolkit', 'react-redux'],
          'vendor-ui':      ['react-hot-toast', 'react-toastify'],
          'vendor-axios':   ['axios'],
          'vendor-exceljs': ['exceljs'],
        },
      },
    },
  },
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