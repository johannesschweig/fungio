import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { supabase } from '~/supabase'
import { mountComposable } from '../helpers/mountComposable'
import { graphqlDetailNode, graphqlLookAlikeEdge } from '../fixtures/shrooms'

const { useAsyncQuery } = vi.hoisted(() => ({ useAsyncQuery: vi.fn() }))
mockNuxtImport('useAsyncQuery', () => useAsyncQuery)
vi.mock('~/supabase', async () => ({ supabase: (await import('../helpers/fakeSupabase')).createFakeSupabase() }))

const fake = supabase as unknown as ReturnType<typeof import('../helpers/fakeSupabase').createFakeSupabase>

const asyncQueryResult = (data: any) => ({ data: ref(data), pending: ref(false), error: ref(null), refresh: vi.fn() })
const detailResponse = (node: any) => ({ fungiCollection: { edges: node ? [{ node }] : [] } })
const photo = (id: number, quality_score: number | null) => ({
  node: { id, url: `https://x/${id}/square.jpg`, attribution: '', license_code: 'cc0', quality_score },
})

function stubUserAgent(userAgent: string) {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent)
}
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

beforeEach(() => {
  fake.reset()
  useAsyncQuery.mockReset()
  vi.restoreAllMocks()
  stubUserAgent(BROWSER_UA)
})

describe('useMushroomById', () => {
  it('queries by id and exposes the flattened mushroom', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult(detailResponse(graphqlDetailNode())))
    const { shroom } = await mountComposable(() => useMushroomById(47347))

    expect(useAsyncQuery.mock.calls[0][1].value).toEqual({ id: 47347 })
    expect(shroom.value).toMatchObject({ id: 47347, name: 'Amanita muscaria', look_alikes: ['456def', '789ghi'] })
  })

  it('exposes null for an unknown id (page shows "Pilz nicht gefunden")', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult(detailResponse(null)))
    const { shroom } = await mountComposable(() => useMushroomById(1))
    expect(shroom.value).toBeNull()
    expect(fake.callsFor('fungi')).toHaveLength(0)
  })

  it('follows a reactive id', async () => {
    useAsyncQuery.mockReturnValue(asyncQueryResult(detailResponse(graphqlDetailNode())))
    const id = ref(1)
    await mountComposable(() => useMushroomById(id))
    const variables = useAsyncQuery.mock.calls[0][1]
    id.value = 2
    expect(variables.value).toEqual({ id: 2 })
  })

  describe('photo pipeline flag (needs_photo_review)', () => {
    const mountWith = async (node: any) => {
      useAsyncQuery.mockReturnValue(asyncQueryResult(detailResponse(node)))
      await mountComposable(() => useMushroomById(node.id))
      await flushPromises()
    }
    const updates = () => fake.callsFor('fungi', 'update')

    it('flags a mushroom whose photos have never been scored — only false -> true, only that row', async () => {
      await mountWith(graphqlDetailNode({ photosCollection: { edges: [photo(1, null)] } }))

      expect(updates()).toHaveLength(1)
      expect(updates()[0].args[0]).toEqual({ needs_photo_review: true })
      expect(fake.callsFor('fungi', 'eq').map(c => c.args)).toEqual([['id', 47347], ['needs_photo_review', false]])
    })

    it('flags a mushroom without any photo', async () => {
      await mountWith(graphqlDetailNode({ photosCollection: { edges: [] } }))
      expect(updates()).toHaveLength(1)
    })

    it('leaves a mushroom alone once at least one photo has a quality score', async () => {
      await mountWith(graphqlDetailNode({ photosCollection: { edges: [photo(1, null), photo(2, 0.8)] } }))
      expect(updates()).toHaveLength(0)
    })

    it('does not flag twice', async () => {
      await mountWith(graphqlDetailNode({ needs_photo_review: true, photosCollection: { edges: [photo(1, null)] } }))
      expect(updates()).toHaveLength(0)
    })

    it('ignores crawlers, so bot traffic cannot flood the pipeline queue', async () => {
      stubUserAgent(BOT_UA)
      await mountWith(graphqlDetailNode({ photosCollection: { edges: [photo(1, null)] } }))
      expect(updates()).toHaveLength(0)
    })
  })
})

describe('useMushroomLookAlikes', () => {
  const mount = (ids: string[], response: any) => {
    useAsyncQuery.mockReturnValue(asyncQueryResult(response))
    return mountComposable(() => useMushroomLookAlikes(ref(ids)))
  }

  it('queries by the id_123 values', async () => {
    await mount(['a', 'b'], { attributesCollection: { edges: [] } })
    expect(useAsyncQuery.mock.calls[0][1].value).toEqual({ ids: ['a', 'b'] })
  })

  it('takes edibility/toxicity from the node, because the nested fungi has no attributes', async () => {
    const { lookAlikes } = await mount(['a', 'b'], {
      attributesCollection: {
        edges: [
          graphqlLookAlikeEdge(1, 'Agaricus campestris', { edibility: 'excellent' }),
          graphqlLookAlikeEdge(2, 'Amanita virosa', { toxicity: 'deadly' }),
        ],
      },
    })

    expect(lookAlikes.value).toHaveLength(2)
    expect(lookAlikes.value[0]).toMatchObject({ id: 1, edibility: 'excellent', toxicity: undefined })
    expect(lookAlikes.value[1]).toMatchObject({ id: 2, toxicity: 'deadly', edibility: undefined })
  })

  it('is empty without ids, even if stale data is still around', async () => {
    const { lookAlikes } = await mount([], { attributesCollection: { edges: [graphqlLookAlikeEdge(1, 'x')] } })
    expect(lookAlikes.value).toEqual([])
  })

  it('skips edges whose fungus is missing', async () => {
    const { lookAlikes } = await mount(['a'], { attributesCollection: { edges: [{ node: { fungi: null } }, graphqlLookAlikeEdge(3, 'y')] } })
    expect(lookAlikes.value.map((s: any) => s.id)).toEqual([3])
  })
})
