// The image proxy (/_ipx/<modifiers>/<source url>, see `image` in nuxt.config.ts) would happily
// resize any allowed-domain image to any size/format on request. Every new combination is a fresh
// sharp run in the Vercel function, so an attacker looping over w_1..w_5000 could exhaust the Hobby
// CPU quota (which pauses the whole project). Only let through exactly what the site itself requests.
export default defineEventHandler((event) => {
  const path = event.path
  if (!path.startsWith('/_ipx/')) return

  const { imageProxy } = useRuntimeConfig(event)
  const [modifiers = '', ...sourceParts] = path.slice('/_ipx/'.length).split('/')
  // Vercel collapses the `//` in the embedded source URL (https://… arrives as https:/…)
  const source = decodeURIComponent(sourceParts.join('/')).replace(/^(https?):\/+/, '$1://')

  const params = new Map(modifiers.split('&').map((m) => {
    const i = m.indexOf('_')
    return [m.slice(0, i), m.slice(i + 1)] as const
  }))

  const allowed = params.size === 3
    && params.get('f') === 'webp'
    && params.get('q') === String(imageProxy.quality)
    && imageProxy.widths.includes(Number(params.get('w')))
    && source.startsWith(`https://${imageProxy.domain}/photos/`)

  if (!allowed) {
    throw createError({ statusCode: 400, statusMessage: 'Image size not allowed' })
  }
})
