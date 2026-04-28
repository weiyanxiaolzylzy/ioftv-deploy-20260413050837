import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ifc/',
  server: {
    port: 5173,
    proxy: {
      // 后端 API 代理
      '/api': {
        target: 'http://localhost:8890',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8890',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    exclude: [
      'web-ifc',
      'web-ifc-three',
      'web-ifc-viewer'
    ]
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});
