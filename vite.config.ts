import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execFileSync } from 'node:child_process';

// La app se publica en GitHub Pages bajo /MiPrimerApp/.
// El flujo de despliegue pasa BASE_PATH con el nombre real del repositorio.
const base = process.env.BASE_PATH ?? '/';
function git(...args: string[]) {
  try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}
const commit = /^[a-f0-9]{7,40}$/i.test(process.env.GITHUB_SHA ?? '') ? process.env.GITHUB_SHA! : git('rev-parse', 'HEAD');
const commitDate = commit ? git('show', '-s', '--format=%cI', commit).slice(0, 10) : '';
const appBuild = { id: commit.slice(0, 8) || 'local', date: commitDate || 'desarrollo local' };

export default defineConfig({
  base,
  define: { __APP_BUILD__: JSON.stringify(appBuild) },
  plugins: [
    react(),
    VitePWA({
      // Keep the running page and its lazy chunks on the same release. A newer
      // worker waits until the person saves and accepts the update.
      registerType: 'prompt',
      // appUpdates owns registration and reloads only after this tab saves.
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Hilvana',
        short_name: 'Hilvana',
        description: 'Diseña, patrona y confecciona: patrones a medida, intervención textil y proyectos de costura.',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#F3F4F1',
        theme_color: '#F3F4F1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,mjs}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
