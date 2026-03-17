import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_URL ? env.VITE_BASE_URL.replace(/\/*$/, '') + '/' : '/'

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico'],
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        manifest: {
          name: 'MyLife — App Personal',
          short_name: 'MyLife',
          description: 'Tu app de productividad personal',
          theme_color: '#08080f',
          background_color: '#08080f',
          display: 'standalone',
          display_override: ['standalone', 'fullscreen'],
          orientation: 'portrait-primary',
          start_url: base,
          scope: base,
          id: '/',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ]
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        },
      })
  ],
  resolve: {
    alias: { '@': '/src' }
  }
  }
})
