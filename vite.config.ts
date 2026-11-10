import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' 使构建产物可以部署在任意子路径（包括静态文件服务器与 itch.io 等）
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
