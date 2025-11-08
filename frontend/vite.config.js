import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/voice-AI-assistant/', // this must match GitHub repo name
})

