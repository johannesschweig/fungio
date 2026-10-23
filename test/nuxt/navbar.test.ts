import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import Navbar from '@/components/Navbar.vue'

mockNuxtImport('useSearchMushroomNames', () => () => ({ suggestions: ref([]) }))

describe('landing navigation', () => {
  it.each(['/', '/en'])('shows only the logo on the home route %s', async (route) => {
    const wrapper = await mountSuspended(Navbar, { route })
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.find('input').exists()).toBe(false)
    wrapper.unmount()
  })
})
