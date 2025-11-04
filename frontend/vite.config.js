import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Set correct base path for GitHub Pages hosting
export default defineConfig({
  plugins: [react()],
  base: '/voice-AI-assistant/', // <-- 👈 must match your GitHub repo name
})
