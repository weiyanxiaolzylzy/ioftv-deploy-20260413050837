import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    proxy: {
      // 独立查看器用 /wasm/ 路径加载 WASM，代理到后端服务器
      '/wasm': {
        target: 'http://localhost:8890',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wasm/, '/wasm')
      },
      // 后端 API 代理
      '/api': {
        target: 'http://localhost:8890',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8890',
        changeOrigin: true
      },
      '/pyapi': {
        target: 'http://localhost:8890',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
});
