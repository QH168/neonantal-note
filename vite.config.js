import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Khi deploy lên GitHub Pages, workflow đặt BASE_PATH=/<tên-repo>/
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  server: { host: true }, // cho phép mở từ điện thoại cùng mạng Wi-Fi khi phát triển
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Ghi chú Sơ sinh',
        short_name: 'Ghi chú SS',
        lang: 'vi',
        display: 'standalone',
        start_url: base,
        scope: base,
        theme_color: '#0B79B8',
        background_color: '#F2F7FB',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        // Lưu phông chữ Be Vietnam Pro để dùng khi không có mạng
        runtimeCaching: [{
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 31536000 }, cacheableResponse: { statuses: [0, 200] } }
        }]
      }
    })
  ]
});
