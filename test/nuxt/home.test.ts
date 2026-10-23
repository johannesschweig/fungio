import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import Home from '@/pages/index.vue'
import { Combobox } from '@headlessui/vue'
import { useStore } from '@/stores/store'

const results = ref<any[]>([])
const pending = ref(false)
const failure = ref<Error | null>(null)
const refresh = vi.fn()
mockNuxtImport('useSearchShrooms', () => () => ({ filteredShrooms: results, loading: pending, error: failure, totalCount: ref(2), refresh }))
mockNuxtImport('useSearchMushroomNames', () => () => ({ suggestions: ref([]) }))

beforeEach(() => {
  useStore().$reset()
  results.value = []
  pending.value = false
  failure.value = null
  refresh.mockClear()
})

describe('landing page', () => {
  it('introduces the guide even while an unused search request is loading', async () => {
    pending.value = true
    const wrapper = await mountSuspended(Home)
    expect(wrapper.find('h1').text()).toBe('Pilze entdecken. Arten verstehen.')
    expect(wrapper.text()).not.toContain('Pilze des Tages')
    expect(wrapper.find('a[href="/all"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/season"]').exists()).toBe(true)
  })

  it('switches to results and restores the introduction when the search is cleared', async () => {
    const wrapper = await mountSuspended(Home)
    const input = wrapper.find('input')
    await input.setValue('pilz')
    await wrapper.findAll('button').find(b => b.text() === 'Suchen')!.trigger('click')
    results.value = [
      { id: 1, name: 'test one', preferred_common_name: 'Erster Pilz' },
      { id: 2, name: 'test two', preferred_common_name: 'Zweiter Pilz' },
    ]
    await flushPromises()
    expect(wrapper.text()).toContain('2 Treffer')
    expect(wrapper.text()).toContain('Erster Pilz')
    expect(wrapper.text()).not.toContain('Folge deiner Neugier.')
    await wrapper.findAll('button').find(b => b.text() === 'Zurück zum Entdecken')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Folge deiner Neugier.')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(wrapper.findComponent(Combobox).props('modelValue')).toBe('')
  })

  it('distinguishes a failed search from an empty result and offers retry', async () => {
    useStore().setSearch('steinpilz')
    failure.value = new Error('offline')
    const wrapper = await mountSuspended(Home)
    expect(wrapper.text()).toContain('Die Suche konnte nicht geladen werden.')
    expect(wrapper.text()).not.toContain('Keine Pilze gefunden.')
    const retry = wrapper.findAll('button').find(b => b.text() === 'Erneut versuchen')!
    await retry.trigger('click')
    expect(refresh).toHaveBeenCalledOnce()
  })
})
