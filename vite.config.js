import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0', // 监听所有IP地址
    port: 5173,      // 指定端口号
    proxy: {
      '/api': {
        target: 'http://192.168.123.130:8880',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/static': {
        target: 'http://192.168.123.130:8880',
        changeOrigin: true
      }
    }
  }
})
