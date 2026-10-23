import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { supabase } from '~/supabase'
import { GERMAN_ALPHABET, toSearchPattern } from '@/utils/utils'
import { useStore } from '@/stores/store'
import { mountComposable } from '../helpers/mountComposable'

const { useAsyncQuery, useLazyQuery } = vi.hoisted(() => ({ useAsyncQuery: vi.fn(), useLazyQuery: vi.fn() }))
mockNuxtImport('useAsyncQuery', () => useAsyncQuery)
mockNuxtImport('useLazyQuery', () => useLazyQuery)
vi.mock('~/supabase', async () => ({ supabase: (await import('../helpers/fakeSupabase')).createFakeSupabase() }))

const fake = supabase as unknown as ReturnType<typeof import('../helpers/fakeSupabase').createFakeSupabase>

const asyncQueryResult = (data: any) => ({ data: ref(data), pending: ref(false), error: ref(null), refresh: vi.fn() })
const edges = (...nodes: any[]) => nodes.map(node => ({ node }))
const photoEdges = (...urls: string[]) => ({ edges: urls.map(url => ({ node: { url } })) })

beforeEach(() => {
  fake.reset()
  useAsyncQuery.mockReset()
  useLazyQuery.mockReset()
  useStore().$reset() // the store is the Nuxt app's own instance, shared between tests
})

describe('useSearchShrooms (home page results)', () => {
  const response = {
    fungiCollection: {
      totalCount: 42,
      edges: edges(
        { id: 1, name: 'Boletus edulis', preferred_common_name: 'Steinpilz', obs_count_ger: 500, attributes: { edibility: 'excellent', toxicity: null }, photosCollection: photoEdges('https://x/1.jpg', 'https://x/other.jpg') },
        { id: 2, name: 'Boletus x', preferred_common_name: null, obs_count_ger: 3, attributes: null, photosCollection: photoEdges() },
      ),
    },
  }

  it('returns nothing while the search box is empty (home shows "Pilze des Tages" instead)', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult(response))
    const { filteredShrooms } = await mountComposable(() => useSearchShrooms())
    expect(filteredShrooms.value).toEqual([])
  })

  it('sends the normalised ilike pattern for the typed text, and follows the store', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult(response))
    const store = useStore()
    await mountComposable(() => useSearchShrooms())
    const variables = useAsyncQuery.mock.calls[0][1]

    expect(variables.value).toEqual({ search: '' })
    store.setSearch('Wiesen-Champignon')
    expect(variables.value).toEqual({ search: toSearchPattern('Wiesen-Champignon') })
    expect(variables.value.search).toBe('%wiesenchampignon%')
  })

  it('maps results for <Card>: first photo only, edibility/toxicity lifted out of attributes', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult(response))
    useStore().setSearch('boletus')
    const { filteredShrooms, totalCount } = await mountComposable(() => useSearchShrooms())

    expect(totalCount.value).toBe(42)
    expect(filteredShrooms.value).toHaveLength(2)
    expect(filteredShrooms.value[0]).toMatchObject({
      id: 1, name: 'Boletus edulis', preferred_common_name: 'Steinpilz', edibility: 'excellent', photos: [{ url: 'https://x/1.jpg' }],
    })
    // no attributes / no photo must not crash
    expect(filteredShrooms.value[1]).toMatchObject({ id: 2, edibility: undefined, photos: null })
  })

  it('handles an empty result', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult({ fungiCollection: { totalCount: 0, edges: [] } }))
    useStore().setSearch('zzzz')
    const { filteredShrooms, totalCount } = await mountComposable(() => useSearchShrooms())
    expect(filteredShrooms.value).toEqual([])
    expect(totalCount.value).toBe(0)
  })
})

describe('useSearchMushroomNames (autocomplete)', () => {
  function setup() {
    const load = vi.fn().mockResolvedValue(undefined)
    let onResultCb: (r: any) => void = () => {}
    useLazyQuery.mockReturnValue({ load, result: ref(null), onResult: (cb: any) => { onResultCb = cb }, onError: vi.fn() })
    const query = ref('')
    return { load, query, emitResult: (r: any) => onResultCb(r), run: () => mountComposable(() => useSearchMushroomNames(query)) }
  }

  it('does not hit the API for 3 characters or fewer', async () => {
    const { load, query, run } = setup()
    await run()
    query.value = 'ste'
    await nextTick()
    expect(load).not.toHaveBeenCalled()
  })

  it('looks up suggestions from 4 characters on, using the normalised pattern', async () => {
    const { load, query, run } = setup()
    await run()
    query.value = 'Stein'
    await nextTick()
    expect(load).toHaveBeenCalledTimes(1)
    expect(load.mock.calls[0][1]).toEqual({ search: '%stein%' })
  })

  it('maps results to suggestions and clears them when the text gets short again', async () => {
    const { query, run, emitResult } = setup()
    const { suggestions } = await run()

    emitResult({ data: { fungiCollection: { edges: edges({ id: 1, name: 'Boletus edulis', preferred_common_name: 'Steinpilz', extra: 'ignored' }) } } })
    expect(suggestions.value).toEqual([{ id: 1, name: 'Boletus edulis', preferred_common_name: 'Steinpilz' }])

    // species that only have a DGfM name keep it so the suggestion can show it
    emitResult({ data: { fungiCollection: { edges: edges({ id: 2, name: 'russula sanguinaria', preferred_common_name: null, german_name_dgfm: 'Bluttäubling' }) } } })
    expect(suggestions.value).toEqual([{ id: 2, name: 'russula sanguinaria', preferred_common_name: null, german_name_dgfm: 'Bluttäubling' }])

    query.value = 'x'
    await nextTick()
    expect(suggestions.value).toEqual([])
  })

  it('reports errors instead of throwing', async () => {
    const { load, query, run } = setup()
    load.mockRejectedValue(new Error('network'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { error, loading } = await run()
    query.value = 'Steinpilz'
    await nextTick()
    await new Promise(r => setTimeout(r))
    expect(error.value).toBeInstanceOf(Error)
    expect(loading.value).toBe(false)
    consoleError.mockRestore()
  })
})

describe('useRandomFungiWithPhoto ("Pilze des Tages")', () => {
  it('keeps only fungi with a photo, uses the first one, and shows at most 12', async () => {
    const withPhoto = (id: number) => ({ id, photosCollection: photoEdges(`https://x/${id}.jpg`, 'https://x/second.jpg') })
    const noPhoto = (id: number) => ({ id, photosCollection: photoEdges() })
    useAsyncQuery.mockReturnValue(asyncQueryResult({
      fungiCollection: { edges: edges(noPhoto(0), ...Array.from({ length: 14 }, (_, i) => withPhoto(i + 1))) },
    }))

    const { mushroomsOfTheDay } = await mountComposable(() => useRandomFungiWithPhoto())

    expect(mushroomsOfTheDay.value).toHaveLength(12)
    expect(mushroomsOfTheDay.value[0]).toEqual({ id: 1, photos: [{ url: 'https://x/1.jpg' }] })
    expect(mushroomsOfTheDay.value.every((m: any) => m.id !== 0)).toBe(true)
  })

  it('is empty when the query returns nothing', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult(null))
    const { mushroomsOfTheDay } = await mountComposable(() => useRandomFungiWithPhoto())
    expect(mushroomsOfTheDay.value).toEqual([])
  })
})

describe('useMushroomsBySeason', () => {
  it('passes the month range through, also for the winter wrap-around', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult(null))
    await mountComposable(() => useMushroomsBySeason(12, 2))
    expect(useAsyncQuery.mock.calls[0][1].value).toEqual({ seasonStart: 12, seasonEnd: 2 })
  })

  it('turns the flat photo_url into the photos array <Card> expects (null when absent)', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult({
      fungi_seasonalCollection: { edges: edges({ id: 1, name: 'a', photo_url: 'https://x/1.jpg' }, { id: 2, name: 'b', photo_url: null }) },
    }))
    const { seasonalMushrooms } = await mountComposable(() => useMushroomsBySeason(ref(3), ref(5)))
    expect(seasonalMushrooms.value[0]).toMatchObject({ id: 1, photos: [{ url: 'https://x/1.jpg' }] })
    expect(seasonalMushrooms.value[1].photos).toBeNull()
  })

  it('is empty for no data', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult(null))
    const { seasonalMushrooms } = await mountComposable(() => useMushroomsBySeason(3, 5))
    expect(seasonalMushrooms.value).toEqual([])
  })
})

describe('useTopEdibleMushrooms', () => {
  const variablesFor = async (slug: string) => {
    useAsyncQuery.mockReset()
    useAsyncQuery.mockReturnValue(asyncQueryResult(null))
    await mountComposable(() => useTopEdibleMushrooms(slug))
    return useAsyncQuery.mock.calls[0][1]
  }

  it.each([
    ['all', 1, 12, ['excellent']],
    ['spring', 3, 5, ['excellent']],
    ['summer', 6, 8, ['excellent']],
    ['autumn', 9, 11, ['excellent']],
    // little grows in winter, so "good" is let in as well
    ['winter', 12, 2, ['excellent', 'good']],
  ])('%s -> months %i-%i, edibility %j', async (slug, seasonStart, seasonEnd, edibilityLevels) => {
    expect(await variablesFor(slug)).toEqual({ seasonStart, seasonEnd, edibilityLevels })
  })

  it('falls back to "all" for an unknown season', async () => {
    expect(await variablesFor('monsoon')).toEqual({ seasonStart: 1, seasonEnd: 12, edibilityLevels: ['excellent'] })
  })

  it('maps photo_url to a photos array, [] when absent', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult({
      fungi_seasonalCollection: { edges: edges({ id: 1, photo_url: 'https://x/1.jpg' }, { id: 2, photo_url: null }) },
    }))
    const { mushrooms } = await mountComposable(() => useTopEdibleMushrooms('all'))
    expect(mushrooms.value[0].photos).toEqual([{ url: 'https://x/1.jpg' }])
    expect(mushrooms.value[1].photos).toEqual([])
  })
})

describe('useRegionalMushrooms', () => {
  const regionalEdge = (id: number, ancestry: string | null, obs_count = 5) => ({ node: {
    obs_count,
    fungi: {
      id, name: `n${id}`, preferred_common_name: null, rank_level: 10, ancestry,
      attributes: { edibility: 'good', toxicity: null, season_from: 3, season_to: 5 },
      photosCollection: photoEdges(`https://x/${id}.jpg`),
    },
  } })
  const mount = (response: any, code = 'de-be') => {
    useAsyncQuery.mockReturnValue(asyncQueryResult(response))
    return mountComposable(() => useRegionalMushrooms(ref(code)))
  }

  it('upper-cases the route param to match region_code in the DB', async () => {
    await mount(null, 'de-by')
    expect(useAsyncQuery.mock.calls[0][1].value).toEqual({ code: 'DE-BY' })
  })

  it('flattens the nested node: fungus fields, attributes and photos on one level', async () => {
    const { mushrooms } = await mount({ fungi_regional_statsCollection: { edges: [regionalEdge(1, '1/2/3')] } })
    expect(mushrooms.value[0]).toMatchObject({
      id: 1, name: 'n1', edibility: 'good', season_from: 3, photos: [{ url: 'https://x/1.jpg' }],
    })
  })

  it.each(['54743', '48250', '416490'])('drops lichens and other non-mushrooms (ancestry contains %s)', async (taxonId) => {
    const { mushrooms } = await mount({
      fungi_regional_statsCollection: { edges: [regionalEdge(1, `1/${taxonId}/9`), regionalEdge(2, '1/2/3')] },
    })
    expect(mushrooms.value.map((m: any) => m.id)).toEqual([2])
  })

  it('keeps fungi without ancestry', async () => {
    const { mushrooms } = await mount({ fungi_regional_statsCollection: { edges: [regionalEdge(1, null)] } })
    expect(mushrooms.value).toHaveLength(1)
  })

  it('returns a top 10 (the query fetches 30 so filtering still leaves enough)', async () => {
    const { mushrooms } = await mount({
      fungi_regional_statsCollection: { edges: Array.from({ length: 30 }, (_, i) => regionalEdge(i + 1, '1/2')) },
    })
    expect(mushrooms.value).toHaveLength(10)
    expect(mushrooms.value[0].id).toBe(1) // order from the query (by obs_count) is kept
  })

  it('exposes the regional observation count (used for the region page totals)', async () => {
    const { mushrooms } = await mount({ fungi_regional_statsCollection: { edges: [regionalEdge(1, '1/2', 36)] } })
    expect(mushrooms.value[0].regional_obs_count).toBe(36)
  })
})

describe('letter index (/all)', () => {
  it('useLetterCounts fills letters without entries with 0 and sums the total', async () => {
    fake.setRpc('get_letter_counts', [{ letter: 'A', count: 10 }, { letter: 'Ä', count: 2 }, { letter: 'S', count: 30 }])
    const { letterStats, totalCount } = await mountComposable(() => useLetterCounts())

    expect(Object.keys(letterStats.value).sort()).toEqual(GERMAN_ALPHABET.split('').sort())
    expect(letterStats.value).toMatchObject({ A: 10, Ä: 2, S: 30, B: 0, Z: 0 })
    expect(totalCount.value).toBe(42)
  })

  it('useMushroomsByLetter asks the DB for the letter and defaults to []', async () => {
    fake.setRpc('get_mushrooms_by_letter', [{ id: 1, name: 'Agaricus' }])
    const { mushrooms } = await mountComposable(() => useMushroomsByLetter('A'))
    expect(mushrooms.value).toEqual([{ id: 1, name: 'Agaricus' }])
    expect(fake.callsFor('rpc:get_mushrooms_by_letter')[0].args[0]).toEqual({ p_letter: 'A' })

    fake.setRpc('get_mushrooms_by_letter', null)
    const empty = await mountComposable(() => useMushroomsByLetter('Q'))
    expect(empty.mushrooms.value).toEqual([])
  })
})
