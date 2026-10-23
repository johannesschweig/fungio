import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fetch, setup } from '@nuxt/test-utils/e2e'

// Smoke tests: do the real pages still render with real data? Reads the real Supabase database
// (read-only) through a running server:
//   E2E_BASE_URL=http://localhost:3000 npm run test:e2e   -> use a server you already started
//   npm run test:e2e                                      -> starts its own `nuxt dev` on a free port
//
// Every request goes out as a crawler on purpose: the detail page flags mushrooms for the photo
// pipeline on *real* visits only (see useMushroomById), so tests must never look like one.
const BOT_UA = 'Mozilla/5.0 (compatible; fungio-e2e-bot)'

const host = process.env.E2E_BASE_URL
await setup({ rootDir: fileURLToPath(new URL('../..', import.meta.url)), host, dev: !host })

type Page = { status: number, html: string, location: string | null, contentType: string }

async function get(path: string): Promise<Page> {
  const res = await fetch(path, {
    redirect: 'manual', // redirects are behaviour we want to look at
    headers: { 'user-agent': BOT_UA, 'accept-language': 'de' },
  })
  return { status: res.status, html: await res.text(), location: res.headers.get('location'), contentType: res.headers.get('content-type') ?? '' }
}

const title = (html: string) => html.match(/<title>([^<]*)<\/title>/)?.[1]
const h1 = (html: string) => html.match(/<h1[^>]*>([^<]*)/)?.[1]?.trim()
const mushroomLinks = (html: string) => [...new Set([...html.matchAll(/href="(\/mushroom\/[^"]+)"/g)].map(m => m[1]))]
const path = (location: string | null) => (location ? new URL(location, 'http://x').pathname : null)

// test-utils only exposes the server context while a test is running (not in beforeAll), so shared
// lookups are fetched lazily from inside the tests and then cached
const once = <T>(load: () => Promise<T>) => {
  let cached: Promise<T> | undefined
  return () => (cached ??= load())
}

// sitemap = list of every public URL, handy to find real, current ids without hardcoding them
const getSitemap = once(async () =>
  (JSON.parse((await get('/api/__sitemap__/urls')).html) as { loc: string }[]).map(u => u.loc))

describe('home page', () => {
  it('introduces the mushroom guide with search, exploration links and an attributed portrait', async () => {
    const page = await get('/')
    expect(page.status).toBe(200)
    expect(title(page.html)).toBe('Fungio - Schnelle und einfache Pilzsuche')
    expect(page.html).toContain('Pilze entdecken.')
    expect(page.html).toContain('Arten verstehen.')
    expect(page.html).not.toContain('Pilze des Tages')
    expect(page.html).toContain('https://www.inaturalist.org/photos/733681634')
    expect(page.html).toContain('https://creativecommons.org/publicdomain/zero/1.0/')
    expect(page.html).toContain('href="/all"')
    expect(page.html).toContain('href="/season"')
    expect(mushroomLinks(page.html).length).toBeGreaterThanOrEqual(1)
    expect(page.html).toMatch(/src="\/_ipx\/f_webp&amp;q_75&amp;w_640\/inat\/photos\//)
    expect(page.html).not.toMatch(/srcset="[^"]*_ipx[^"]* 2x"/) // one size per photo, no retina (2x) variant
  })

  it('bare species ids redirect permanently to the canonical URL, which renders', async () => {
    const canonical = mushroomLinks((await get('/')).html)[0]
    const firstLink = canonical.replace(/(\/mushroom\/\d+).*/, '$1')
    const redirect = await get(firstLink)
    expect(redirect.status).toBe(301)
    expect(path(redirect.location)).toMatch(/^\/mushroom\/\d+-[a-z0-9-]+$/)

    const page = await get(path(redirect.location)!)
    expect(page.status).toBe(200)
    expect(h1(page.html)).toBeTruthy()
  })
})

describe('mushroom detail page', () => {
  const getUrl = once(async () => (await getSitemap()).find(u => /^\/mushroom\/\d+-pfifferling$/.test(u))!)

  it('has a well-known species in the data', async () => {
    expect(await getUrl()).toBeTruthy()
  })

  it('renders names, SEO tags, gallery and look-alikes server-side', async () => {
    const url = await getUrl()
    const page = await get(url)
    expect(page.status).toBe(200)
    expect(title(page.html)).toBe('Pfifferling - Pilzinformationen | Fungio')
    expect(h1(page.html)).toBe('Pfifferling')
    expect(page.html).toContain(`rel="canonical" href="https://fungio.de${url}"`)
    expect(page.html).toContain('application/ld+json')
    expect(page.html).toMatch(/src="\/_ipx\/[^"]*\/inat\/photos\//)
    expect(page.html).toContain('Verwechslungsgefahr')
  })

  it('redirects the bare id and a wrong slug to the canonical URL', async () => {
    const url = await getUrl()
    const id = url.split('/')[2].split('-')[0]
    for (const variant of [`/mushroom/${id}`, `/mushroom/${id}-falscher-name`]) {
      const res = await get(variant)
      expect(res.status, variant).toBe(301)
      expect(path(res.location), variant).toBe(url)
    }
  })

  it('shows "not found" for an id that does not exist', async () => {
    const page = await get('/mushroom/99999999')
    expect(page.html).toContain('Pilz nicht gefunden')
  })
})

describe('season pages', () => {
  it.each([
    ['spring', 'Das Frühlingserwachen'],
    ['summer', 'Der Sommerwald'],
    ['autumn', 'Der Herbstwald'],
    ['winter', 'Die Winterruhe'],
  ])('/season/%s shows its mushrooms', async (season, headline) => {
    const page = await get(`/season/${season}`)
    expect(page.status).toBe(200)
    expect(title(page.html)).toBe(`${headline} | Fungio`)
    expect(mushroomLinks(page.html).length).toBeGreaterThanOrEqual(6)
  })

  it('sends an unknown season back to the home page', async () => {
    const res = await get('/season/monsoon')
    expect(res.status).toBe(302)
    expect(path(res.location)).toBe('/')
  })

  it('/season forwards to the current season', async () => {
    const res = await get('/season')
    expect(res.status).toBe(302)
    expect(path(res.location)).toMatch(/^\/season\/(spring|summer|autumn|winter)$/)
  })
})

describe('top edible mushrooms', () => {
  it('/top-edible forwards to the all-year list', async () => {
    const res = await get('/top-edible')
    expect(res.status).toBe(302)
    expect(path(res.location)).toBe('/top-edible/all')
  })

  it.each([
    ['/all', 'Top 10 Speisepilze | Fungio'],
    ['/spring', 'Top 10 Speisepilze im Frühling | Fungio'],
    ['/summer', 'Top 10 Speisepilze im Sommer | Fungio'],
    ['/autumn', 'Top 10 Speisepilze im Herbst | Fungio'],
    ['/winter', 'Top 10 Speisepilze im Winter | Fungio'],
  ])('/top-edible%s lists up to 10 mushrooms', async (suffix, expectedTitle) => {
    const page = await get(`/top-edible${suffix}`)
    expect(page.status).toBe(200)
    expect(title(page.html)).toBe(expectedTitle)
    const count = mushroomLinks(page.html).length
    expect(count).toBeGreaterThanOrEqual(5)
    expect(count).toBeLessThanOrEqual(10)
  })
})

describe('regional top lists', () => {
  const codes = ['bw', 'by', 'be', 'bb', 'hb', 'hh', 'he', 'mv', 'ni', 'nw', 'rp', 'sl', 'sn', 'st', 'sh', 'th']

  it.each(codes)('/region/de-%s has data', async (code) => {
    const page = await get(`/region/de-${code}`)
    expect(page.status).toBe(200)
    expect(title(page.html)).toMatch(/^Pilzfunde in .+ \| Top 10 \| Fungio$/)
    expect(mushroomLinks(page.html).length).toBeGreaterThanOrEqual(1)
  })

  it('shows the right state', async () => {
    expect(title((await get('/region/de-be')).html)).toBe('Pilzfunde in Berlin | Top 10 | Fungio')
  })
})

describe('A-Z index', () => {
  it('lists all 29 letters', async () => {
    const page = await get('/all')
    expect(page.status).toBe(200)
    expect(title(page.html)).toBe('Alle Pilze - Fungio')
    expect([...new Set([...page.html.matchAll(/href="(\/all\/[^"]+)"/g)].map(m => m[1]))]).toHaveLength(29)
  })

  it.each(['A', 'S', '%C3%84'])('/all/%s lists mushrooms', async (letter) => {
    const page = await get(`/all/${letter}`)
    expect(page.status).toBe(200)
    expect(title(page.html)).toBe(`Pilze mit ${decodeURIComponent(letter)} - Fungio`)
    expect(mushroomLinks(page.html).length).toBeGreaterThanOrEqual(1)
  })
})

describe('taxonomy pages', () => {
  it('/taxa renders', async () => {
    const page = await get('/taxa')
    expect(page.status).toBe(200)
    expect(title(page.html)).toBe('Pilz-Taxonomie: Alle Ordnungen | Fungio')
  })

  it('a taxon page from the sitemap renders', async () => {
    const taxonUrl = (await getSitemap()).find(u => /^\/taxa\/\d+-/.test(u))!
    expect(taxonUrl).toBeTruthy()
    const page = await get(taxonUrl)
    expect(page.status).toBe(200)
    expect(title(page.html)).toMatch(/Fungio$/)
  })
})

describe('static pages', () => {
  it.each(['/imprint', '/privacy'])('%s renders', async (route) => {
    expect((await get(route)).status).toBe(200)
  })
})

describe('sitemap + robots.txt', () => {
  it('sitemap lists every section and a large number of mushrooms, without duplicates', async () => {
    const sitemap = await getSitemap()
    expect(sitemap.length).toBe(new Set(sitemap).size)
    expect(sitemap.every(u => u.startsWith('/'))).toBe(true)
    for (const expected of ['/season/spring', '/season/winter', '/top-edible/all', '/top-edible/winter', '/region/de-be', '/taxa']) {
      expect(sitemap, expected).toContain(expected)
    }
    expect(sitemap.filter(u => u.startsWith('/region/'))).toHaveLength(16)
    expect(sitemap.filter(u => /^\/mushroom\/\d+-[a-z0-9-]+$/.test(u)).length).toBeGreaterThan(5000)
    expect(sitemap.filter(u => u.startsWith('/taxa/')).length).toBeGreaterThan(100)
  })

  it('the sitemap index is served as XML', async () => {
    const page = await get('/sitemap_index.xml')
    expect(page.status).toBe(200)
    expect(page.contentType).toContain('xml')
  })

  it('robots.txt keeps AI/SEO crawlers out, lets everyone else in, and points to the sitemap', async () => {
    const { html: robots } = await get('/robots.txt')
    // the block of "User-Agent:" lines that ends in `Disallow: /` (the file starts with a comment that also mentions GPTBot)
    const blocked = robots.split(/\n\s*\n/).find(block => block.startsWith('User-Agent: GPTBot'))!
    expect(blocked).toContain('User-Agent: ClaudeBot')
    expect(blocked).toContain('User-Agent: QlyzeBot')
    expect(blocked).toContain('User-Agent: Reflectionbot')
    expect(blocked).toContain('Disallow: /')
    expect(robots).toMatch(/User-Agent: \*\s+Disallow:\s*\n/)
    expect(robots).toContain('Sitemap: https://fungio.de/sitemap_index.xml')
  })
})

// The image proxy runs sharp inside the (quota-limited) serverless function: only the exact sizes the
// site itself uses may get through, otherwise anyone could burn the CPU quota with ?w=1..5000.
describe('image proxy (/_ipx)', () => {
  // Derive an allowed thumbnail size from the landing portrait for the proxy contract checks.
  const getThumb = once(async () =>
    (await get('/')).html.match(/src="(\/_ipx\/[^"]+)"/)![1].replaceAll('&amp;', '&').replace('w_640', 'w_80'))

  it('serves an allowed size as WebP', async () => {
    const thumb = await getThumb()
    const res = await fetch(thumb, { headers: { 'user-agent': BOT_UA } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/webp')
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(100)
  })

  it.each([
    ['an arbitrary width', (p: string) => p.replace('w_80', 'w_81')],
    ['a retina (2x) width, which the site no longer uses', (p: string) => p.replace('w_80', 'w_160')],
    ['a query string', (p: string) => `${p}?x=1`],
    ['another format', (p: string) => p.replace('f_webp', 'f_png')],
    ['an extra modifier', (p: string) => p.replace('w_80', 'w_80&blur_5')],
    ['a source outside /photos/', (p: string) => p.replace('/inat/photos/', '/inat/other/')],
  ])('refuses %s', async (_name, change) => {
    const thumb = await getThumb()
    const res = await fetch(change(thumb), { headers: { 'user-agent': BOT_UA } })
    expect(res.status).toBe(400)
  })
})
