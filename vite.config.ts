import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Em desenvolvimento, /api vai para o FastAPI (uvicorn)
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
