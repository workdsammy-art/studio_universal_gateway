import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

const version = fs.readFileSync(path.resolve(__dirname, '../VERSION'), 'utf-8').trim().split('\n')[0].trim()

export default defineConfig({
  base: '/gateway',
  plugins: [vue()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { outDir: 'dist', emptyOutDir: true },
})
