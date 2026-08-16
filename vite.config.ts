import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Caminhos relativos: a app funciona servida de qualquer subpasta
  // (GitHub Pages, ficheiro local, WebView do APK).
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icone-192.png', 'icone-512.png'],
      workbox: {
        // O pdf.worker é grande mas queremos a importação a funcionar offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      manifest: {
        name: 'Dossier do Treinador',
        short_name: 'Dossier',
        description:
          'Gestão de plantel, exercícios, treinos, periodização e jogos. Offline, no telemóvel e no computador.',
        lang: 'pt-PT',
        theme_color: '#16a34a',
        background_color: '#0b1120',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icone-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    // Permite abrir a app no telemóvel pelo IP do PC, na mesma rede.
    host: true,
  },
});
