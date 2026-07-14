import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/codex-work-masusoft/',
  plugins: [react()],
})
