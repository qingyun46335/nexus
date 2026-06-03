import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
// import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  plugins: [cloudflare({
    configPath: './wrangler.jsonc',
  }),
    // ssrPlugin()
  ],
  build: {
    sourcemap: true,
  },
  environments: {
    server: {
      build: {
        // 输出到根目录 dist/server
        outDir: './dist/server',
        emptyOutDir: true,
        target: 'esnext',
        minify: true,
        sourcemap: false,
      },
    },
  },
})
