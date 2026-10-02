import { createIPX, createIPXFetchHandler, ipxHttpStorage, parseIPXURL } from 'ipx'

// Our own /_ipx image proxy (registered via `serverHandlers` in nuxt.config.ts). @nuxt/image would
// bring its own, but that one goes through ipx's Node adapter, which require()s an ES module and
// crashes on Vercel (ERR_REQUIRE_ESM) — ipx's fetch handler doesn't, so we wire that up ourselves.
//
// URL shape: /_ipx/<modifiers>/<source url>, e.g. /_ipx/f_webp&q_75&w_320/https://…/large.jpg
const BASE = '/_ipx'

const { imageProxy } = useRuntimeConfig()

const httpStorage = ipxHttpStorage({
  domains: [imageProxy.domain],
  blockPrivateIPs: true,
})

const ipx = createIPX({
  storage: {
    ...httpStorage,
    // ipx normally sends a HEAD to the source first, only to read its cache headers — S3 sends none,
    // and every round trip from Vercel (Frankfurt) to S3 (us-east-1) costs ~0.2 s on an uncached photo.
    // Resized photos never change, so browser + Vercel CDN may simply keep them for imageProxy.maxAge.
    getMeta: async () => ({ maxAge: imageProxy.maxAge }),
  },
})

// Vercel collapses the `//` in the embedded source URL (https://… arrives as https:/…)
const normalizeSource = (source: string) => source.replace(/^(https?):\/+/, '$1://')

const handleIPX = createIPXFetchHandler(ipx, {
  parseURL(url: string) {
    const { origin, pathname, search } = new URL(url)
    const parsed = parseIPXURL(origin + pathname.slice(BASE.length) + search)
    return { ...parsed, id: normalizeSource(parsed.id) }
  },
})

export default defineEventHandler((event) => {
  // Every new size/format combination is a fresh sharp run in the Vercel function, so an attacker
  // looping over w_1..w_5000 could exhaust the Hobby CPU quota (which pauses the whole project).
  // Only let through exactly what the site itself requests (sizes from shared/utils/image.ts), and no
  // query string — the CDN caches per full URL, so ?x=1, ?x=2, … would each force a new sharp run.
  const [modifiers = '', ...sourceParts] = event.path.slice(BASE.length + 1).split('/')
  const source = normalizeSource(decodeURIComponent(sourceParts.join('/')))
  const params = new Map(modifiers.split('&').map((m) => {
    const i = m.indexOf('_')
    return [m.slice(0, i), m.slice(i + 1)] as const
  }))

  const allowed = !event.path.includes('?')
    && params.size === 3
    && params.get('f') === 'webp'
    && params.get('q') === String(imageProxy.quality)
    && imageProxy.widths.includes(Number(params.get('w')))
    && source.startsWith(`https://${imageProxy.domain}/photos/`)

  if (!allowed) {
    throw createError({ statusCode: 400, statusMessage: 'Image size not allowed' })
  }

  return handleIPX(toWebRequest(event))
})
