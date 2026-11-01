import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  build: {
    sourcemap: false
  },
  server: {
    watch: {
      ignored: [
        '**/build/**',
        '**/.dart_tool/**',
        '**/server/**',
        '**/data/**',
        '**/*.json',
        '**/*.log',
        '**/*.sqlite',
        '**/.git/**'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
})
