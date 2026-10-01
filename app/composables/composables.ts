import { SEARCH_MUSHROOMS, GET_SHROOM_BY_ID, GET_RANDOM_FUNGI, SEARCH_MUSHROOM_NAMES, GET_LOOK_ALIKE_FUNGI, GET_MUSHROOMS_BY_SEASON, GET_TOP_REGIONAL } from "@/composables/queries"
import { flattenFungi } from "@/composables/utils"
import { computed, ref, onMounted, watch } from "vue"
import type { Ref } from "vue"
import { useStore } from "@/stores/store"
import { supabase } from "~/supabase"
import { GERMAN_ALPHABET } from "@/utils/utils"
import type { Taxon } from "@/utils/utils"
import type Shroom from "@/types/Shroom"
import { isbot } from "isbot"

// crawlers (search engines, uptime checks, scrapers) render pages via SSR just like real
// visitors and would otherwise flood the photo pipeline queue — see useMushroomById below
function isBotRequest(): boolean {
  const userAgent = import.meta.server
    ? useRequestHeaders(['user-agent'])['user-agent']
    : navigator.userAgent
  return isbot(userAgent)
}

export function useMushroomById(id: Ref<number> | number) {
  const idRef = typeof id === 'number' ? computed(() => id) : id
  const variables = computed(() => ({ id: idRef.value }))

  // Correct syntax: query, variables, clientId (optional), options (optional)
  const query = useAsyncQuery(
    GET_SHROOM_BY_ID,
    variables
  )
  const { data: shroom, pending: loading, error } = query

  const flatShroom = computed(() =>
    shroom.value ? flattenFungi(shroom.value.fungiCollection.edges[0]?.node) : null
  )

  // photo pipeline hook: flag fungi whose photos haven't been quality-scored yet
  // (none at all, or none scored) so the pipeline knows to fetch/score them later.
  // Allowed for the publishable-key client only via a narrow RLS policy + column grant
  // (see migrations/fungi_needs_photo_review.sql) — it can flip this one column
  // false -> true and nothing else.
  watch(flatShroom, (newShroom) => {
    if (!newShroom || newShroom.needs_photo_review) return
    const hasScoredPhoto = newShroom.photos?.some(p => p.quality_score != null)
    if (hasScoredPhoto) return
    if (isBotRequest()) return

    supabase.from('fungi')
      .update({ needs_photo_review: true })
      .eq('id', newShroom.id)
      .eq('needs_photo_review', false)
      .then(({ error: err }) => {
        if (err) console.error('Fehler beim Setzen von needs_photo_review:', err)
      })
  }, { immediate: true })

  // `ready` lets the page wait for the shroom during SSR (needed to know the look-alike ids)
  return { shroom: flatShroom, loading, error, ready: query }
}

export function useRandomFungiWithPhoto() {
  const { data, pending: loading, error } = useAsyncQuery(
    GET_RANDOM_FUNGI
  )

  const mushroomsOfTheDay = computed(() =>
    (data.value?.fungiCollection.edges ?? [])
      .map((edge: any) => {
        const fungi = edge.node
        const photoEdges = fungi.photosCollection.edges
        const photos = photoEdges.length > 0 ? [photoEdges[0].node] : null
        if (photos) {
          return {
            id: fungi.id,
            photos
          }
        }
      })
      .filter(Boolean)
      .slice(0, 12)
  )

  return {
    mushroomsOfTheDay,
    loading,
    error
  }
}

export function useSearchMushroomNames(queryRef: Ref<string>) {
  const suggestions = ref<{ id: number, name: string, preferred_common_name: string | null }[]>([])
  const loading = ref(false)
  const error = ref(null)

  // Use useLazyQuery for client-side queries
  const { load, result, onResult, onError } = useLazyQuery(SEARCH_MUSHROOM_NAMES)

  watch(queryRef, async (val) => {
    if (val && val.length > 3) {
      loading.value = true
      try {
        await load(SEARCH_MUSHROOM_NAMES, { search: toSearchPattern(val) })
      } catch (e) {
        console.error('Error searching mushroom names:', e)
        error.value = e as any
      } finally {
        loading.value = false
      }
    } else {
      suggestions.value = []
    }
  })

  onResult((resultData) => {
    if (resultData.data?.fungiCollection?.edges) {
      suggestions.value = resultData.data.fungiCollection.edges
        .map((e: any) => ({
          id: e.node.id,
          name: e.node.name,
          preferred_common_name: e.node.preferred_common_name
        }))
    }
  })

  onError((e) => {
    error.value = e as any
  })

  return { suggestions, loading, error }
}


export function useSearchShrooms() {
  const store = useStore()
  const searchQuery = computed(() => store.search)

  const variables = computed(() => ({
    search: searchQuery.value ? toSearchPattern(searchQuery.value) : ''
  }))

  const enabled = computed(() => searchQuery.value.length > 0)

  const { data, pending: loading, error, refresh } = useAsyncQuery(
    SEARCH_MUSHROOMS,
    variables
  )

  const filteredShrooms = computed(() => {
    if (!enabled.value || !data.value?.fungiCollection) return []
    return (data.value.fungiCollection.edges ?? []).map((e: any) => {
      const fungi = e.node
      const attributes = fungi.attributes || {}
      const photoEdges = fungi.photosCollection?.edges || []
      const photos = photoEdges.length > 0 ? [photoEdges[0].node] : null
      return {
        id: fungi.id,
        name: fungi.name,
        preferred_common_name: fungi.preferred_common_name,
        obs_count_ger: fungi.obs_count_ger,
        edibility: attributes.edibility,
        toxicity: attributes.toxicity,
        photos,
      }
    })
  })

  const totalCount = computed(() => data.value?.fungiCollection?.totalCount || 0)

  return { filteredShrooms, loading, error, totalCount, refresh }
}

export function useMushroomLookAlikes(lookAlikeIds: Ref<string[]>) {
  const variables = computed(() => ({ ids: lookAlikeIds.value }))

  const { data, pending: loading, error, refresh } = useAsyncQuery(
    GET_LOOK_ALIKE_FUNGI,
    variables
  )

  const lookAlikes = computed(() => {
    // Return empty if no valid IDs
    if (!lookAlikeIds.value.length || !data.value?.attributesCollection?.edges) return []

    return data.value.attributesCollection.edges
      .map((e: any) => flattenFungi(e.node?.fungi))
      .filter(Boolean)
  })

  return { lookAlikes, loading, error, refetch: refresh }
}


export function useLetterCounts() {
  const { data, pending: loading, error } = useAsyncData('letter-counts', async () => {
    const { data: counts } = await supabase.rpc('get_letter_counts')

    // Fill missing letters with 0
    const stats: Record<string, number> = {}
    GERMAN_ALPHABET.split('').forEach(l => {
      stats[l] = 0
    })

    counts.forEach((row: any) => {
      stats[row.letter] = row.count
    })

    return {
      counts: stats,
      total: counts.reduce((sum: number, row: any) => sum + row.count, 0)
    }
  })

  return {
    letterStats: computed(() => data.value?.counts || {}),
    totalCount: computed(() => data.value?.total || 0),
    loading,
    error
  }
}

export function useMushroomsByLetter(letter: Ref<string> | string) {
  const effectiveLetter = typeof letter === 'string' ? ref(letter) : letter

  const { data, pending: loading, error } = useAsyncData(
    `mushrooms-${effectiveLetter.value}`,
    async () => {
      const { data: mushrooms } = await supabase.rpc('get_mushrooms_by_letter', {
        p_letter: effectiveLetter.value
      })

      return mushrooms || []
    }
  )

  return {
    mushrooms: computed(() => data.value || []),
    loading,
    error
  }
}

export function useMushroomsBySeason(monthFrom: Ref<number> | number, monthTo: Ref<number> | number) {
  const monthFromRef = isRef(monthFrom) ? monthFrom : computed(() => monthFrom)
  const monthToRef = isRef(monthTo) ? monthTo : computed(() => monthTo)

  const variables = computed(() => ({
    seasonStart: monthFromRef.value,
    seasonEnd: monthToRef.value
  }))

  const { data, pending: loading, error } = useAsyncQuery(
    GET_MUSHROOMS_BY_SEASON,
    variables
  )

  const seasonalMushrooms = computed(() => {
    const res = data.value as any
    if (!res?.fungi_seasonalCollection?.edges) return []

    return res.fungi_seasonalCollection.edges.map((edge: any) => {
      const node = edge.node

      return {
        ...edge.node,
        // Mapping the flat URL back to the expected photo object structure
        photos: node.photo_url ? [{ url: node.photo_url }] : null,
      }
    })
  })

  return { seasonalMushrooms, loading, error }
}

export function useTopEdibleMushrooms(seasonSlug: Ref<string> | string = 'all') {
  const seasonMap: Record<string, { start: number; end: number; levels: string[] }> = {
    all: { start: 1, end: 12, levels: ['excellent'] },
    spring: { start: 3, end: 5, levels: ['excellent'] },
    summer: { start: 6, end: 8, levels: ['excellent'] },
    autumn: { start: 9, end: 11, levels: ['excellent'] },
    winter: { start: 12, end: 2, levels: ['excellent', 'good'] }
  }

  const queryVariables = computed(() => {
    const s = unref(seasonSlug)
    const config = seasonMap[s] || seasonMap.all

    return {
      seasonStart: config.start,
      seasonEnd: config.end,
      edibilityLevels: config.levels
    }
  })

  const { data, pending, error, refresh } = useAsyncQuery(
    GET_TOP_EDIBLE_MUSHROOMS,
    queryVariables.value
  )

  const mushrooms = computed(() => {
    return data.value?.fungi_seasonalCollection?.edges.map((edge: any) => ({
      ...edge.node,
      photos: edge.node.photo_url ? [{ url: edge.node.photo_url }] : []
    })) || []
  })

  watch(queryVariables, () => {
    refresh()
  })

  return {
    mushrooms,
    loading: pending,
    error
  }
}

export function useRegionalMushrooms(regionCode: Ref<string>) {
  const variables = computed(() => ({
    code: regionCode.value.toUpperCase()
  }))

  const { data, pending: loading, error } = useAsyncQuery(
    GET_TOP_REGIONAL,
    variables
  )

  // Transform the GraphQL nesting into a flat Shroom object
  const mushrooms = computed(() => {
    if (!data.value?.fungi_regional_statsCollection?.edges) return []

    return data.value.fungi_regional_statsCollection.edges.map((edge: any) => {
      const node = edge.node
      const fungiNode = node.fungi
      const attributes = fungiNode.attributes || {}

      // Flatten the photos collection into the standard array format your Card expects
      const photos = fungiNode.photosCollection?.edges.map((p: any) => p.node) || []

      return {
        ...fungiNode,
        ...attributes,
        photos, // Card component usually expects shroom.photos[0].url
        regional_obs_count: node.obs_count
      }
    })
      .filter((shroom: any) => {
        if (!shroom.ancestry) return true

        // exclude lichens and small mushrooms
        const isLichen = shroom.ancestry.includes('54743') ||
          shroom.ancestry.includes('48250') ||
          shroom.ancestry.includes('416490') 

        return !isLichen
      })
      .slice(0, 10)
  })

  return { mushrooms, loading, error }
}

// --- Taxon pages (Ordnung/Familie/Gattung) ---
// `taxa` has no ancestry/parent_id column, so ancestors and children are derived
// from the `ancestry` string on `fungi` (species-level, iNaturalist convention).

type TaxonDescendantFungi = {
  id: number
  name: string
  preferred_common_name: string | null
  ancestry: string
  obs_count_ger: number | null
}

// shaped to satisfy the existing Shroom type (used by <Card>) wherever fields overlap
export type TaxonChildMushroom = Shroom & { id: number, name: string }

// one entry per child taxon (or, on a genus page, per child species), paired with its
// most popular example mushroom so the template never has to zip parallel arrays
export type TaxonChildEntry = {
  id: number
  name: string
  preferred_common_name?: string | null
  rank_level: number
  mushroom: TaxonChildMushroom
}

async function enrichFungi(rows: TaxonDescendantFungi[]): Promise<TaxonChildMushroom[]> {
  const ids = rows.map(r => r.id)
  if (ids.length === 0) return []

  const [{ data: attrs }, { data: photos }] = await Promise.all([
    supabase.from('attributes').select('fungi_id, edibility, toxicity, season_from, season_to').in('fungi_id', ids),
    supabase.from('photos').select('fungi_id, url, attribution, license_code').in('fungi_id', ids).order('id', { ascending: true })
  ])

  const attrsById = new Map((attrs ?? []).map((a: any) => [a.fungi_id, a]))
  const photosById = new Map<number, any[]>()
  ;(photos ?? []).forEach((p: any) => {
    const list = photosById.get(p.fungi_id) ?? []
    list.push(p)
    photosById.set(p.fungi_id, list)
  })

  return rows.map(row => {
    const attr = attrsById.get(row.id) as any
    return {
      ...row,
      preferred_common_name: row.preferred_common_name ?? undefined,
      obs_count_ger: row.obs_count_ger ?? undefined,
      edibility: attr?.edibility ?? undefined,
      toxicity: attr?.toxicity ?? undefined,
      season_from: attr?.season_from ?? undefined,
      season_to: attr?.season_to ?? undefined,
      photos: photosById.get(row.id) ?? []
    } as TaxonChildMushroom
  })
}

export function useTaxonById(id: Ref<number> | number) {
  const idRef = typeof id === 'number' ? computed(() => id) : id
  const taxon = ref<Taxon | null>(null)
  const loading = ref(true)
  const error = ref(null)

  const fetchTaxon = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('taxa')
        .select('id, name, preferred_common_name, rank_level')
        .eq('id', idRef.value)
        .single()

      if (err) throw err
      taxon.value = data
    } catch (e) {
      console.error('Fehler beim Laden des Taxons:', e)
      error.value = e as any
      taxon.value = null
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchTaxon)
  watch(idRef, fetchTaxon)

  return { taxon, loading, error }
}

export function useTaxonPage(taxon: Ref<Taxon | null>) {
  // ancestry string of one descendant fungus, handed to <MushroomBreadcrumb> as-is so it can
  // resolve/render the ancestor chain exactly like it does on the mushroom detail page
  const representativeAncestry = ref('')
  const childEntries = ref<TaxonChildEntry[]>([])
  const loading = ref(true)
  const error = ref(null)

  const childRankLevel = computed(() => taxon.value ? taxon.value.rank_level - 10 : null)
  const childrenAreSpecies = computed(() => childRankLevel.value === 10)

  const fetchPageData = async () => {
    if (!taxon.value) return
    loading.value = true
    representativeAncestry.value = ''
    childEntries.value = []

    try {
      // one fetch covers both the ancestor chain (via any descendant's ancestry string)
      // and the direct children (grouped by which id in that string matches the child rank)
      const pattern = `(^|/)${taxon.value.id}(/|$)`
      const { data: descendants, error: err } = await supabase
        .from('fungi')
        .select('id, name, preferred_common_name, ancestry, obs_count_ger')
        .filter('ancestry', 'match', pattern)
        .order('obs_count_ger', { ascending: false, nullsFirst: false })

      if (err) throw err

      const rows: TaxonDescendantFungi[] = descendants ?? []

      if (rows.length > 0) {
        representativeAncestry.value = rows[0].ancestry
      }

      if (childRankLevel.value === null) {
        // nothing below species level
      } else if (childrenAreSpecies.value) {
        // genus page: each descendant fungus IS a child, already sorted by popularity,
        // and is its own "example mushroom"
        const enriched = await enrichFungi(rows)
        childEntries.value = enriched
          .map(mushroom => ({
            id: mushroom.id,
            name: mushroom.name,
            preferred_common_name: mushroom.preferred_common_name,
            rank_level: 10,
            mushroom
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      } else {
        // order/family page: group descendant ids by the child taxon (family/genus) they belong to
        const childIds = new Set<number>()
        rows.forEach(row => {
          row.ancestry.split('/').map(id => parseInt(id)).filter(id => !isNaN(id)).forEach(id => childIds.add(id))
        })

        if (childIds.size > 0) {
          const { data: childTaxa, error: childErr } = await supabase
            .from('taxa')
            .select('id, name, preferred_common_name, rank_level')
            .in('id', Array.from(childIds))
            .eq('rank_level', childRankLevel.value)

          if (childErr) throw childErr

          // rows are already sorted by obs_count_ger desc, so the first match per child is its most popular example
          const exampleByChildId = new Map<number, TaxonDescendantFungi>()
          for (const child of childTaxa ?? []) {
            const example = rows.find(row => row.ancestry.split('/').includes(String(child.id)))
            if (example) exampleByChildId.set(child.id, example)
          }

          const enriched = await enrichFungi(Array.from(exampleByChildId.values()))
          const enrichedById = new Map(enriched.map(e => [e.id, e]))

          childEntries.value = (childTaxa ?? [])
            .map(child => {
              const example = exampleByChildId.get(child.id)
              const mushroom = example ? enrichedById.get(example.id) : undefined
              return mushroom ? { id: child.id, name: child.name, preferred_common_name: child.preferred_common_name, rank_level: child.rank_level, mushroom } : undefined
            })
            .filter((entry): entry is TaxonChildEntry => !!entry)
            .sort((a, b) => a.name.localeCompare(b.name))
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden der Taxon-Seite:', e)
      error.value = e as any
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchPageData)
  watch(() => taxon.value?.id, fetchPageData)

  return { representativeAncestry, childEntries, childRankLevel, childrenAreSpecies, loading, error }
}

// /taxa overview page — all orders (rank_level 40), just the taxa themselves (no per-order
// example mushroom: that would mean one full ancestry scan per order, far too slow for an
// overview page — see the perf note on useTaxonPage)
export function useAllOrders() {
  const orders = ref<Taxon[]>([])
  const loading = ref(true)
  const error = ref(null)

  onMounted(async () => {
    try {
      const { data, error: err } = await supabase
        .from('taxa')
        .select('id, name, preferred_common_name, rank_level')
        .eq('rank_level', 40)

      if (err) throw err

      orders.value = (data ?? []).sort((a: Taxon, b: Taxon) => a.name.localeCompare(b.name))
    } catch (e) {
      console.error('Fehler beim Laden der Ordnungen:', e)
      error.value = e as any
    } finally {
      loading.value = false
    }
  })

  return { orders, loading, error }
}