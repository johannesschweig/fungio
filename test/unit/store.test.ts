import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStore } from '@/stores/store'

describe('store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  describe('search', () => {
    it('setSearch stores the query and re-arms the single-result redirect on the home page', () => {
      const store = useStore()
      store.redirected = true
      store.setSearch('Steinpilz')
      expect(store.search).toBe('Steinpilz')
      expect(store.redirected).toBe(false)
    })
  })

  describe('filters', () => {
    it('toggleFilter adds a value, and removes it again on the second call', () => {
      const store = useStore()
      store.toggleFilter('type', 'gilled')
      expect(store.filters).toEqual({ type: ['gilled'] })
      store.toggleFilter('type', 'gilled')
      expect(store.filters).toEqual({})
    })

    it('removes the key only once its last value is gone', () => {
      const store = useStore()
      store.toggleFilter('type', 'gilled')
      store.toggleFilter('type', 'poroid')
      store.toggleFilter('type', 'gilled')
      expect(store.filters).toEqual({ type: ['poroid'] })
      expect(store.filtersActive).toBe(1)
    })

    it('counts values across keys in totalFilters, keys in filtersActive', () => {
      const store = useStore()
      store.toggleFilter('type', 'gilled')
      store.toggleFilter('type', 'poroid')
      store.toggleFilter('edibility', 'good')
      expect(store.totalFilters).toBe(3)
      expect(store.filtersActive).toBe(2)
    })

    it('clearFilters resets everything', () => {
      const store = useStore()
      store.toggleFilter('type', 'gilled')
      store.clearFilters()
      expect(store.totalFilters).toBe(0)
      expect(store.filtersActive).toBe(0)
    })
  })

  describe('getMatches', () => {
    const shrooms: any[] = [
      { id: 1, edibility: 'good', type: ['gilled'], cap: { color: 'red' } },
      { id: 2, edibility: 'excellent', type: ['poroid', 'gilled'], cap: { color: 'brown' } },
      { id: 3, edibility: null, type: [], cap: null },
    ]
    const ids = (list: any[]) => list.map(s => s.id)

    it('matches scalar values, nested paths and array membership', () => {
      const store = useStore()
      store.filteredShrooms = shrooms
      expect(ids(store.getMatches('edibility', 'good'))).toEqual([1])
      expect(ids(store.getMatches('cap.color', 'brown'))).toEqual([2])
      expect(ids(store.getMatches('type', 'gilled'))).toEqual([1, 2])
    })

    it('without a value, matches anything that is set / non-empty', () => {
      const store = useStore()
      store.filteredShrooms = shrooms
      expect(ids(store.getMatches('edibility'))).toEqual([1, 2])
      expect(ids(store.getMatches('type'))).toEqual([1, 2])
      expect(ids(store.getMatches('cap.color'))).toEqual([1, 2])
    })
  })
})
