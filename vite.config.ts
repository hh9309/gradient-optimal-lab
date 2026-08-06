import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // GitHub Pages 部署路径
  base: '/gradient-optimal-lab/',

  plugins: [
    react(),
    tailwindcss()
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5173,

    // HMR 配置
    hmr: process.env.DISABLE_HMR !== 'true',

    // AI Studio 环境关闭文件监听
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },

  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
