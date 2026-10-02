// https://nuxt.com/docs/api/configuration/nuxt-config
import { IMAGE_WIDTHS } from './shared/utils/image'

// iNaturalist photos are resized + converted to WebP by our own image proxy (IPX at /_ipx, runs in
// the Vercel function) and then cached by Vercel's CDN. Only the sizes from IMAGE_WIDTHS (1x + 2x)
// are allowed (server/middleware/ipx-guard.ts) — otherwise anyone could burn the Vercel Hobby CPU
// quota by requesting arbitrary widths.
const IMAGE_QUALITY = 75
const IMAGE_DOMAIN = 'inaturalist-open-data.s3.amazonaws.com'

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
    domains: [IMAGE_DOMAIN],
    densities: [1, 2],
    presets: {
      photo: { modifiers: { format: 'webp', quality: IMAGE_QUALITY } },
    },
    ipx: {
      http: {
        // S3 sends no cache headers; resized photos never change, so let browser + CDN keep them for a year
        maxAge: 60 * 60 * 24 * 365,
        blockPrivateIPs: true,
      },
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
    // read by server/middleware/ipx-guard.ts
    imageProxy: {
      domain: IMAGE_DOMAIN,
      quality: IMAGE_QUALITY,
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