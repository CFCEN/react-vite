import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    minify: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        minifyInternalExports: true,
        entryFileNames: 'entry-[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js', // 代码分割的 chunk 文件命名
        assetFileNames: 'assets/[name]-[hash].[ext]', // 其他资产文件命名
        dir: 'dist', // 输出目录
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
