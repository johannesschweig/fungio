import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import Card from '@/components/Card.vue'
import SearchBar from '@/components/SearchBar.vue'
import SeasonFilter from '@/components/SeasonFilter.vue'
import RegionFilter from '@/components/RegionFilter.vue'
import MushroomLookAlikes from '@/components/mushroom-detail/MushroomLookAlikes.vue'
import { useStore } from '@/stores/store'
import { stateNames } from '@/utils/utils'
import type Shroom from '@/types/Shroom'

// SearchBar's autocomplete talks to GraphQL — not what is under test here
const suggestions = ref<any[]>([])
mockNuxtImport('useSearchMushroomNames', () => () => ({ suggestions, loading: ref(false), error: ref(null) }))

const shroom = (overrides: Partial<Shroom> = {}): Shroom => ({
  id: 7, name: 'Amanita muscaria', preferred_common_name: 'Fliegenpilz', ancestry: '', ...overrides,
})
const photo = { url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/square.jpg', attribution: '', license_code: 'cc0' }

beforeEach(() => {
  useStore().$reset()
  suggestions.value = []
})

describe('<Card>', () => {
  const mount = (props: Record<string, any>) => mountSuspended(Card, { props })

  describe('list variant', () => {
    it('links to the mushroom detail page and shows German + latin name', async () => {
      const wrapper = await mount({ shroom: shroom() })
      expect(wrapper.find('a').attributes('href')).toBe('/mushroom/7-fliegenpilz')
      expect(wrapper.text()).toContain('Fliegenpilz')
      expect(wrapper.text()).toContain('Amanita muscaria')
    })

    it('shows only the latin name when there is no German name', async () => {
      const wrapper = await mount({ shroom: shroom({ preferred_common_name: undefined }) })
      expect(wrapper.find('a').attributes('href')).toBe('/mushroom/7-amanita-muscaria')
      expect(wrapper.text()).toBe('Amanita muscaria')
    })

    it('renders the photo with alt text, or a placeholder when there is none', async () => {
      const withPhoto = await mount({ shroom: shroom({ photos: [photo] }) })
      expect(withPhoto.find('img').attributes('alt')).toBe('Fliegenpilz')
      expect(withPhoto.find('img').attributes('src')).toContain('/_ipx/')

      const without = await mount({ shroom: shroom({ photos: [] }) })
      expect(without.find('img').exists()).toBe(false)
      expect(without.find('svg, [class*="bg-stone-200"]').exists()).toBe(true)
    })

    it.each([
      [{ toxicity: 'deadly' }, 'Tödlich giftig'],
      [{ toxicity: 'toxic' }, 'Giftig'],
      [{ edibility: 'excellent' }, 'Ausgezeichnet'],
    ] as const)('flags %j as "%s"', async (attrs, label) => {
      const wrapper = await mount({ shroom: shroom(attrs as any) })
      expect(wrapper.find(`[title="${label}"]`).exists()).toBe(true)
    })

    it('hides the status badge on mobile unless asked to always show it', async () => {
      const normal = await mount({ shroom: shroom({ toxicity: 'deadly' }) })
      expect(normal.find('[title="Tödlich giftig"]').classes()).toContain('hidden')
      const always = await mount({ shroom: shroom({ toxicity: 'deadly' }), alwaysShowStatus: true })
      expect(always.find('[title="Tödlich giftig"]').classes()).not.toContain('hidden')
    })

    describe('search highlighting', () => {
      it('marks the matched part of the name', async () => {
        useStore().setSearch('fliegen')
        const wrapper = await mount({ shroom: shroom(), highlight: true })
        expect(wrapper.find('span.bg-amber-100').text()).toBe('Fliegen')
      })

      it('matches across hyphens and umlauts, highlighting the original characters', async () => {
        useStore().setSearch('wiesenchampignon')
        const hyphen = await mount({ shroom: shroom({ preferred_common_name: 'Wiesen-Champignon' }), highlight: true })
        expect(hyphen.find('span.bg-amber-100').text()).toBe('Wiesen-Champignon')

        useStore().setSearch('taeubling')
        const umlaut = await mount({ shroom: shroom({ preferred_common_name: 'Täubling' }), highlight: true })
        expect(umlaut.find('span.bg-amber-100').text()).toBe('Täubling')
      })

      it('does not highlight without the flag, without a query, or without a match', async () => {
        useStore().setSearch('fliegen')
        expect((await mount({ shroom: shroom() })).find('span.bg-amber-100').exists()).toBe(false)
        expect((await mount({ shroom: shroom(), highlight: true })).find('span.bg-amber-100').exists()).toBe(true)
        useStore().setSearch('')
        expect((await mount({ shroom: shroom(), highlight: true })).find('span.bg-amber-100').exists()).toBe(false)
        useStore().setSearch('steinpilz')
        expect((await mount({ shroom: shroom(), highlight: true })).find('span.bg-amber-100').exists()).toBe(false)
      })
    })
  })

  describe('large variant', () => {
    const large = (s: Partial<Shroom> = {}, extra: Record<string, any> = {}) =>
      mount({ shroom: shroom(s), variant: 'large', ...extra })

    it('links to the detail page and shows names', async () => {
      const wrapper = await large()
      expect(wrapper.find('a').attributes('href')).toBe('/mushroom/7-fliegenpilz')
      expect(wrapper.find('h2').text()).toBe('Fliegenpilz')
      expect(wrapper.text()).toContain('Amanita muscaria')
    })

    it('falls back to the capitalised latin name as title', async () => {
      const wrapper = await large({ preferred_common_name: undefined, name: 'boletus edulis' })
      expect(wrapper.find('h2').text()).toBe('Boletus edulis')
    })

    it.each([
      [3, 5, 'Mär - Mai'],
      [9, 3, 'Sep - Mär'],
      [6, 6, 'Jun'],
      [1, 12, 'Ganzjährig'],
    ])('season %i-%i is shown as "%s"', async (season_from, season_to, text) => {
      const wrapper = await large({ season_from, season_to })
      expect(wrapper.text()).toContain(text)
    })

    it('has no season pill without season data', async () => {
      expect((await large()).text()).not.toContain('📅')
    })

    it('shows the toxicity/edibility pill with text', async () => {
      expect((await large({ toxicity: 'deadly' })).text()).toContain('Tödlich giftig')
    })

    it('loads the first card eagerly (above the fold) and the rest lazily', async () => {
      expect((await large({ photos: [photo] }, { priority: true })).find('img').attributes('loading')).toBe('eager')
      expect((await large({ photos: [photo] })).find('img').attributes('loading')).toBe('lazy')
    })
  })
})

describe('<MushroomLookAlikes>', () => {
  const mount = (lookAlikes: Shroom[]) => mountSuspended(MushroomLookAlikes, { props: { lookAlikes } })

  it('renders nothing when there are no look-alikes', async () => {
    const wrapper = await mount([])
    expect(wrapper.text()).toBe('')
  })

  it('lists the most commonly seen look-alike first', async () => {
    const wrapper = await mount([
      shroom({ id: 1, preferred_common_name: 'Selten', obs_count_ger: 2 }),
      shroom({ id: 2, preferred_common_name: 'Häufig', obs_count_ger: 900 }),
      shroom({ id: 3, preferred_common_name: 'Mittel', obs_count_ger: 50 }),
    ])
    expect(wrapper.findAll('a').map(a => a.attributes('href'))).toEqual([
      '/mushroom/2-haeufig', '/mushroom/3-mittel', '/mushroom/1-selten',
    ])
  })

  it('warns in the header about deadly and toxic look-alikes, with counts', async () => {
    const wrapper = await mount([
      shroom({ id: 1, toxicity: 'deadly' }),
      shroom({ id: 2, toxicity: 'deadly' }),
      shroom({ id: 3, toxicity: 'toxic' }),
      shroom({ id: 4, edibility: 'excellent' }),
    ])
    expect(wrapper.text()).toContain('2 tödlich giftig')
    expect(wrapper.text()).toContain('1 giftig')
  })

  it('shows no warning when every look-alike is harmless', async () => {
    const wrapper = await mount([shroom({ id: 4, edibility: 'good' })])
    expect(wrapper.text()).not.toContain('tödlich giftig')
    expect(wrapper.text()).not.toMatch(/\d giftig/)
  })

  it('does not mutate the list it was given', async () => {
    const list = [shroom({ id: 1, obs_count_ger: 1 }), shroom({ id: 2, obs_count_ger: 99 })]
    await mount(list)
    expect(list.map(s => s.id)).toEqual([1, 2])
  })
})

describe('<SeasonFilter>', () => {
  const links = (wrapper: any) => wrapper.findAll('a').map((a: any) => [a.text(), a.attributes('href')])

  it('season overview: four seasons (no "all" — the page itself is that)', async () => {
    const wrapper = await mountSuspended(SeasonFilter, { props: { basePath: '/season', activeSeason: 'summer' } })
    expect(links(wrapper)).toEqual([
      ['Frühling', '/season/spring'], ['Sommer', '/season/summer'], ['Herbst', '/season/autumn'], ['Winter', '/season/winter'],
    ])
  })

  it('top-edible: "Alle anzeigen" points to the base path', async () => {
    const wrapper = await mountSuspended(SeasonFilter, { props: { basePath: '/top-edible' } })
    expect(links(wrapper)[0]).toEqual(['Alle anzeigen', '/top-edible'])
    expect(links(wrapper)).toHaveLength(5)
  })

  it('highlights only the active season', async () => {
    const wrapper = await mountSuspended(SeasonFilter, { props: { basePath: '/top-edible', activeSeason: 'autumn' } })
    const active = wrapper.findAll('a').filter(a => a.classes().includes('bg-tan-900'))
    expect(active.map(a => a.text())).toEqual(['Herbst'])
  })
})

describe('<RegionFilter>', () => {
  it('shows the active state, or a prompt for an unknown one', async () => {
    expect((await mountSuspended(RegionFilter, { props: { activeState: 'DE-BE' } })).text()).toContain('Berlin')
    expect((await mountSuspended(RegionFilter, { props: { activeState: 'XX' } })).text()).toContain('Region wählen')
  })

  it('opens a dropdown with all 16 states, alphabetically, linking to /region/<code>', async () => {
    const wrapper = await mountSuspended(RegionFilter, { props: { activeState: 'DE-BE' } })
    expect(wrapper.findAll('a')).toHaveLength(0)

    await wrapper.find('button').trigger('click')
    const items = wrapper.findAll('a')
    expect(items).toHaveLength(Object.keys(stateNames).length)

    const names = items.map(a => a.text().replace('Aktuell', '').trim())
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    expect(wrapper.find('a[href="/region/de-by"]').text()).toContain('Bayern')
    expect(items.filter(a => a.text().includes('Aktuell')).map(a => a.attributes('href'))).toEqual(['/region/de-be'])
  })
})

describe('<SearchBar>', () => {
  const type = async (wrapper: any, text: string) => {
    const input = wrapper.find('input')
    await input.setValue(text)
    await input.trigger('keyup.enter')
    await flushPromises()
  }

  it('shows an already active search in the input (regression: it used to render blank)', async () => {
    useStore().setSearch('Steinpilz')
    const wrapper = await mountSuspended(SearchBar)
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Steinpilz')
  })

  it('pressing Enter puts the text into the store', async () => {
    const wrapper = await mountSuspended(SearchBar, { route: '/' })
    await type(wrapper, 'Pfifferling')
    expect(useStore().search).toBe('Pfifferling')
  })

  it('the "Suchen" button searches too', async () => {
    const wrapper = await mountSuspended(SearchBar, { route: '/' })
    await wrapper.find('input').setValue('Birkenpilz')
    await wrapper.findAll('button').find(b => b.text() === 'Suchen')!.trigger('click')
    expect(useStore().search).toBe('Birkenpilz')
  })

  it('searching from another page (e.g. the navbar) goes to the home page, where results render', async () => {
    const push = vi.spyOn(useRouter(), 'push').mockResolvedValue(undefined)
    const wrapper = await mountSuspended(SearchBar, { props: { compact: true }, route: '/season/spring' })
    await type(wrapper, 'Steinpilz')
    expect(push).toHaveBeenCalledWith('/')
    push.mockRestore()
  })

  it('searching on the home page stays there', async () => {
    const push = vi.spyOn(useRouter(), 'push').mockResolvedValue(undefined)
    const wrapper = await mountSuspended(SearchBar, { route: '/' })
    await type(wrapper, 'Steinpilz')
    expect(push).not.toHaveBeenCalled()
    push.mockRestore()
  })

  it('the clear button empties input and store', async () => {
    const wrapper = await mountSuspended(SearchBar, { route: '/' })
    await type(wrapper, 'Steinpilz')

    await wrapper.find('button[aria-label="Clear search"]').trigger('click')
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    expect(useStore().search).toBe('')
    expect(wrapper.find('button[aria-label="Clear search"]').exists()).toBe(false)
  })

  it('follows search changes made elsewhere (e.g. clicking a genus on the detail page)', async () => {
    const wrapper = await mountSuspended(SearchBar, { route: '/' })
    useStore().setSearch('Amanita')
    await flushPromises()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Amanita')
  })
})
