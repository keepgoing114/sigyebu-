import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
 base: '/sigyebu-/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png'],
      manifest: {
        name: '시계부',
        short_name: '시계부',
        description: '하루 시간을 어디에 썼는지 기록하는 앱',
        theme_color: '#0d0f1e',
        background_color: '#0d0f1e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/sigyebu-/',
        icons: [
          { src: 'icon.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
})
