import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Three projects, from fast to slow (see test/README.md):
//   unit  - pure functions + Pinia store, plain Node, no Nuxt boot, no network
//   nuxt  - composables/components inside a real Nuxt context, Supabase/Apollo mocked
//   e2e   - renders real pages against a running server + the real database (opt-in: npm run test:e2e)
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
        },
        resolve: {
          alias: { '@': r('./app'), '~': r('./app') },
        },
        plugins: [
          {
            // `import Icon from '@/assets/x.svg'` is handled by nuxt-svgo in the app; in plain
            // Node tests an empty stub component is enough, we only compare identities
            name: 'stub-svg',
            enforce: 'pre',
            resolveId: id => (id.endsWith('.svg') ? `\0svg-stub:${id}` : null),
            load: (id) => id.startsWith('\0svg-stub:')
              ? `export default { name: ${JSON.stringify(id.slice(10))} }`
              : null,
          },
        ],
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.test.ts'],
          environment: 'nuxt',
          // Vitest 5 caches transformed modules on disk by default; for Nuxt's virtual app entry
          // that cache is poisoned after the first run ("Failed to resolve import ./nuxt.js"),
          // so every second `npm test` would fail until node_modules/.vitest-cache is deleted
          fsModuleCache: false,
        },
      }),
      {
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.test.ts'],
          environment: 'node',
          testTimeout: 60_000,
          hookTimeout: 180_000,
        },
      },
    ],
  },
})
