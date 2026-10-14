import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'

// Runs a composable inside a real component (so onMounted/watch/useAsyncData behave like in the app)
// and returns what it returned.
export async function mountComposable<T>(composable: () => T): Promise<T> {
  let result!: T
  await mountSuspended(defineComponent({
    setup() {
      result = composable()
      return () => h('div')
    },
  }))
  await flushPromises()
  return result
}
