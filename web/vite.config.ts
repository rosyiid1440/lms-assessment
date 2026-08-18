import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: ['lms.rosyiid.my.id'],
    proxy: {
      '/api': 'http://localhost:5000',
      '/storage': 'http://localhost:5000'
    }
  }
})
