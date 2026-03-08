import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function cloudflarePagesSpaFallback(): Plugin {
  return {
    name: 'cloudflare-pages-spa-fallback',
    apply: 'build',
    async closeBundle() {
      const distDirectory = resolve(process.cwd(), 'dist');
      const indexPath = resolve(distDirectory, 'index.html');
      const notFoundPath = resolve(distDirectory, '404.html');
      const html = await readFile(indexPath, 'utf8');
      await writeFile(notFoundPath, html, 'utf8');
    },
  };
}

export default defineConfig({
  plugins: [react(), cloudflarePagesSpaFallback()],
  assetsInclude: ['**/*.md', '**/*.mdx'],
});
