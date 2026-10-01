// https://nuxt.com/docs/api/configuration/nuxt-config
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
  ],
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