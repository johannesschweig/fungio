// https://nuxt.com/docs/api/configuration/nuxt-config
import { cp, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { IMAGE_WIDTHS, PHOTO_ORIGIN } from './shared/utils/image'

// iNaturalist photos are resized + converted to WebP by our own image proxy (server/ipx.ts at /_ipx,
// runs in the Vercel function) and then cached by Vercel's CDN. Only the sizes from IMAGE_WIDTHS
// (1x + 2x) are allowed — otherwise anyone could burn the Vercel Hobby CPU quota by requesting
// arbitrary widths.
const IMAGE_QUALITY = 75

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    'nuxt-svgo',
    '@nuxtjs/apollo',
    '@nuxtjs/sitemap',
    'nuxt-schema-org',
    '@vueuse/nuxt',
    '@nuxt/image',
  ],
  image: {
    // must be explicit: on Vercel the module would otherwise auto-pick Vercel's own image
    // optimization, whose Hobby quota (5k/month) fails images with 402 once exceeded
    provider: 'ipx',
    domains: [new URL(PHOTO_ORIGIN).host],
    densities: [1, 2],
    presets: {
      photo: { modifiers: { format: 'webp', quality: IMAGE_QUALITY } },
    },
  },
  // our own /_ipx handler — @nuxt/image sees it and skips registering its own (see server/ipx.ts why)
  serverHandlers: [
    { route: '/_ipx/**', handler: '~~/server/ipx.ts' },
  ],
  hooks: {
    // sharp picks its native binary via require('@img/sharp-<platform>/sharp.node') inside a switch,
    // which the server bundle's dependency tracer doesn't follow — so the binaries would be missing
    // on Vercel. Copy whatever platform packages npm installed (linux-x64 on Vercel) next to the bundle.
    // Added via nitro.hooks.hook() on purpose: a `nitro.hooks.compiled` config entry would replace the
    // Vercel preset's own `compiled` hook, which writes .vercel/output/config.json.
    'nitro:init'(nitro) {
      nitro.hooks.hook('compiled', async () => {
        const from = fileURLToPath(new URL('./node_modules/@img', import.meta.url))
        const to = join(nitro.options.output.serverDir, 'node_modules/@img')
        for (const pkg of await readdir(from)) {
          if (pkg.startsWith('sharp-') && !pkg.includes('wasm')) {
            await cp(join(from, pkg), join(to, pkg), { recursive: true, dereference: true })
          }
        }
      })
    },
  },
  site: {
    url: 'https://fungio.de',
    name: 'Fungio',
  },
  sitemap: {
    sources: [
      '/api/__sitemap__/urls'
    ]
  },
  runtimeConfig: {
    // read by server/ipx.ts
    imageProxy: {
      quality: IMAGE_QUALITY,
      maxAge: 60 * 60 * 24 * 365, // seconds; resized photos never change
      widths: [...new Set(Object.entries(IMAGE_WIDTHS).flatMap(([slot, width]) =>
        slot === 'lightbox' ? [width] : [width, width * 2]))],
    },
    public: {
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseServiceRoleKey: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    }
  },
  apollo: {
    clients: {
      default: {
        httpEndpoint: process.env.VITE_SUPABASE_URL + '/graphql/v1',
        httpLinkOptions: {
          headers: {
            apikey: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
          }
        },
        devtools: {
          enabled: true
        }
      },
    }
  },
  i18n: {
    locales: [
      { code: 'de', language: 'de-DE', file: 'de.json', name: 'Deutsch' },
      { code: 'en', language: 'en-US', file: 'en.json', name: 'English' },
    ],
    defaultLocale: 'de'
  },
  app: {
    head: {
      title: 'Fungio',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }
      ],
      link: [
        { rel: 'icon', href: '/mushroom.png' }
      ],
    },
  },
  css: [
    '~/assets/style.css'
  ],
  svgo: {
    defaultImport: 'component',
    svgoConfig: {
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              removeViewBox: false,
            },
          },
        },
        'removeDimensions', // Remove width/height so sizing classes work
      ],
    },
  },
})