import { defineSitemapEventHandler } from '#imports'
import { supabase } from '~/supabase'

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// PostgREST caps every response at ~1500 rows, so large tables have to be read in pages
const PAGE_SIZE = 1000
async function fetchAll(table: 'fungi' | 'taxa', filter?: (q: any) => any) {
  const rows: { id: number, name: string, preferred_common_name: string | null }[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select('id, name, preferred_common_name')
    if (filter) query = filter(query)
    const { data, error } = await query.order('id').range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

const detailUrl = (prefix: string, row: { id: number, name: string, preferred_common_name: string | null }) =>
  ({ loc: `${prefix}/${row.id}-${createSlug(row.preferred_common_name || row.name)}` })

export default defineSitemapEventHandler(async () => {
  const seasonPages = ['spring', 'summer', 'autumn', 'winter'].map(season => ({ loc: `/season/${season}` }))

  const topEdiblePages = ['all', 'spring', 'summer', 'autumn', 'winter'].map(season => ({ loc: `/top-edible/${season}` }))

  const stateCodes = [
    'de-bw', 'de-by', 'de-be', 'de-bb', 'de-hb', 'de-hh', 'de-he', 'de-mv',
    'de-ni', 'de-nw', 'de-rp', 'de-sl', 'de-sn', 'de-st', 'de-sh', 'de-th'
  ]
  const regionPages = stateCodes.map(code => ({ loc: `/region/${code}` }))

  try {
    const shrooms = await fetchAll('fungi')
    // taxa pages (Ordnung/Familie/Gattung)
    const taxa = await fetchAll('taxa', q => q.in('rank_level', [20, 30, 40]))

    return [
      ...seasonPages,
      ...topEdiblePages,
      ...shrooms.map(s => detailUrl('/mushroom', s)),
      ...regionPages,
      { loc: '/taxa' },
      ...taxa.map(t => detailUrl('/taxa', t))
    ]
  } catch (e) {
    console.error('Sitemap Loop Error:', e)
    return [...seasonPages, ...topEdiblePages, ...regionPages] // static pages still work if the DB fetch fails
  }
})
