import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { supabase } from '~/supabase'
import type { Taxon } from '@/utils/utils'
import { mountComposable } from '../helpers/mountComposable'

vi.mock('~/supabase', async () => ({ supabase: (await import('../helpers/fakeSupabase')).createFakeSupabase() }))

const fake = supabase as unknown as ReturnType<typeof import('../helpers/fakeSupabase').createFakeSupabase>

// Tiny taxonomy (iNaturalist ancestry convention, ids "/"-separated, species last):
//   order 100 (Boletales)
//     family 200 (Boletaceae)  -> genus 300 (Boletus)  -> species 1 Boletus edulis, 2 Boletus badius
//                              -> genus 310 (Leccinum) -> species 3 Leccinum scabrum
//     family 210 (Paxillaceae) -> genus 320 (Paxillus) -> species 4 Paxillus involutus
const fungiRows = [
  { id: 1, name: 'Boletus edulis', preferred_common_name: 'Steinpilz', ancestry: '1000/100/200/300/1', obs_count_ger: 900 },
  { id: 3, name: 'Leccinum scabrum', preferred_common_name: 'Birkenpilz', ancestry: '1000/100/200/310/3', obs_count_ger: 500 },
  { id: 2, name: 'Boletus badius', preferred_common_name: null, ancestry: '1000/100/200/300/2', obs_count_ger: 300 },
  { id: 4, name: 'Paxillus involutus', preferred_common_name: 'Kahler Krempling', ancestry: '1000/100/210/320/4', obs_count_ger: 100 },
]
const taxa: Record<number, Taxon> = {
  100: { id: 100, name: 'Boletales', preferred_common_name: null, rank_level: 40 },
  200: { id: 200, name: 'Boletaceae', preferred_common_name: 'Dickröhrlingsverwandte', rank_level: 30 },
  210: { id: 210, name: 'Paxillaceae', preferred_common_name: null, rank_level: 30 },
  300: { id: 300, name: 'Boletus', preferred_common_name: null, rank_level: 20 },
  310: { id: 310, name: 'Leccinum', preferred_common_name: null, rank_level: 20 },
  320: { id: 320, name: 'Paxillus', preferred_common_name: null, rank_level: 20 },
}

beforeEach(() => {
  fake.reset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function seedTaxonomy(descendantsOf: number[], childRank?: number) {
  fake.setTable('fungi', fungiRows.filter(f => descendantsOf.includes(f.id)))
  // the page asks `taxa` for the ids found in the ancestry strings, filtered to the child rank
  fake.setTable('taxa', Object.values(taxa).filter(t => t.rank_level === childRank))
  fake.setTable('attributes', fungiRows.map(f => ({ fungi_id: f.id, edibility: f.id === 1 ? 'excellent' : null, toxicity: null, season_from: 6, season_to: 10 })))
  fake.setTable('photos', fungiRows.flatMap(f => [
    { fungi_id: f.id, url: `https://x/${f.id}/a.jpg`, attribution: '', license_code: 'cc0' },
    { fungi_id: f.id, url: `https://x/${f.id}/b.jpg`, attribution: '', license_code: 'cc0' },
  ]))
}

describe('useTaxonById', () => {
  it('loads the taxon by id', async () => {
    fake.setTable('taxa', [taxa[200]])
    const { taxon, loading, error } = await mountComposable(() => useTaxonById(200))

    expect(taxon.value).toEqual(taxa[200])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(fake.callsFor('taxa', 'eq')[0].args).toEqual(['id', 200])
  })

  it('reports an error for an unknown id (page shows not-found) instead of throwing', async () => {
    fake.setTable('taxa', null, { message: 'JSON object requested, multiple (or no) rows returned' })
    const { taxon, error, loading } = await mountComposable(() => useTaxonById(999999))
    expect(taxon.value).toBeNull()
    expect(error.value).toBeTruthy()
    expect(loading.value).toBe(false)
  })

  it('reloads when the id changes', async () => {
    fake.setTable('taxa', [taxa[200]])
    const id = ref(200)
    const { taxon } = await mountComposable(() => useTaxonById(id))

    fake.setTable('taxa', [taxa[210]])
    id.value = 210
    await new Promise(r => setTimeout(r))
    expect(taxon.value?.id).toBe(210)
  })
})

describe('useTaxonPage', () => {
  it('genus page: lists the species themselves, sorted by name, each as its own example', async () => {
    seedTaxonomy([1, 2])
    const { childEntries, childrenAreSpecies, childRankLevel, representativeAncestry } =
      await mountComposable(() => useTaxonPage(ref(taxa[300])))

    expect(childRankLevel.value).toBe(10)
    expect(childrenAreSpecies.value).toBe(true)
    expect(childEntries.value.map(e => e.name)).toEqual(['Boletus badius', 'Boletus edulis'])
    expect(childEntries.value[1]).toMatchObject({ id: 1, rank_level: 10, preferred_common_name: 'Steinpilz' })
    // example mushroom carries edibility + all photos (in id order)
    expect(childEntries.value[1].mushroom).toMatchObject({ edibility: 'excellent', season_from: 6 })
    expect(childEntries.value[1].mushroom.photos).toHaveLength(2)
    // most popular descendant provides the breadcrumb ancestry
    expect(representativeAncestry.value).toBe('1000/100/200/300/1')
  })

  it('finds descendants through the ancestry path, anchored so id 20 does not match 200', async () => {
    seedTaxonomy([1, 2])
    await mountComposable(() => useTaxonPage(ref(taxa[300])))

    const [, op, pattern] = fake.callsFor('fungi', 'filter')[0].args
    expect(op).toBe('match')
    const regex = new RegExp(pattern)
    expect(regex.test('1000/100/200/300/1')).toBe(true) // genus in the middle
    expect(regex.test('300/1')).toBe(true) // at the start
    expect(regex.test('1000/3000/1')).toBe(false) // 3000 is not 300
    expect(regex.test('1000/100/200/30')).toBe(false)
    expect(fake.callsFor('fungi', 'order')[0].args).toEqual(['obs_count_ger', { ascending: false, nullsFirst: false }])
  })

  it('family page: one entry per genus, each with its most popular species as example', async () => {
    seedTaxonomy([1, 2, 3], 20)
    const { childEntries, childrenAreSpecies, childRankLevel } = await mountComposable(() => useTaxonPage(ref(taxa[200])))

    expect(childRankLevel.value).toBe(20)
    expect(childrenAreSpecies.value).toBe(false)
    expect(childEntries.value.map(e => [e.name, e.rank_level, e.mushroom.id])).toEqual([
      ['Boletus', 20, 1], // Steinpilz (900) beats Boletus badius (300)
      ['Leccinum', 20, 3],
    ])
    // only taxa of the child rank are requested
    expect(fake.callsFor('taxa', 'eq')[0].args).toEqual(['rank_level', 20])
  })

  it('order page: one entry per family', async () => {
    seedTaxonomy([1, 2, 3, 4], 30)
    const { childEntries, childRankLevel } = await mountComposable(() => useTaxonPage(ref(taxa[100])))

    expect(childRankLevel.value).toBe(30)
    expect(childEntries.value.map(e => [e.name, e.mushroom.id])).toEqual([['Boletaceae', 1], ['Paxillaceae', 4]])
  })

  it('drops child taxa that have no mushroom (nothing to show on their card)', async () => {
    seedTaxonomy([1], 20) // fungi has only species 1, but `taxa` returns all three genera
    const { childEntries } = await mountComposable(() => useTaxonPage(ref(taxa[200])))
    expect(childEntries.value.map(e => e.name)).toEqual(['Boletus'])
  })

  it('shows an empty page (no crash) when nothing lives below the taxon', async () => {
    seedTaxonomy([], 20)
    const { childEntries, representativeAncestry, error, loading } = await mountComposable(() => useTaxonPage(ref(taxa[200])))
    expect(childEntries.value).toEqual([])
    expect(representativeAncestry.value).toBe('')
    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('surfaces database errors instead of leaving the page loading forever', async () => {
    fake.setTable('fungi', null, { message: 'boom' })
    const { error, loading, childEntries } = await mountComposable(() => useTaxonPage(ref(taxa[300])))
    expect(error.value).toBeTruthy()
    expect(loading.value).toBe(false)
    expect(childEntries.value).toEqual([])
  })

  it('waits for the taxon before loading anything', async () => {
    const taxon = ref<Taxon | null>(null)
    const { loading } = await mountComposable(() => useTaxonPage(taxon))
    expect(fake.callsFor('fungi')).toHaveLength(0)
    expect(loading.value).toBe(true)
  })
})

describe('useAllOrders (/taxa)', () => {
  it('loads only orders (rank 40), sorted by name', async () => {
    fake.setTable('taxa', [
      { id: 2, name: 'Russulales', preferred_common_name: null, rank_level: 40 },
      { id: 1, name: 'Agaricales', preferred_common_name: null, rank_level: 40 },
    ])
    const { orders, loading } = await mountComposable(() => useAllOrders())

    expect(orders.value.map(o => o.name)).toEqual(['Agaricales', 'Russulales'])
    expect(loading.value).toBe(false)
    expect(fake.callsFor('taxa', 'eq')[0].args).toEqual(['rank_level', 40])
  })

  it('reports errors', async () => {
    fake.setTable('taxa', null, { message: 'boom' })
    const { orders, error, loading } = await mountComposable(() => useAllOrders())
    expect(orders.value).toEqual([])
    expect(error.value).toBeTruthy()
    expect(loading.value).toBe(false)
  })
})
