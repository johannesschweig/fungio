# Tests

Vitest + `@nuxt/test-utils`. Three layers, from fast to slow:

| Command | What it covers | Speed | Needs |
|---|---|---|---|
| `npm run test:unit` | Pure logic: slugs, search normalisation, season text, `flattenFungi`, Pinia store, image URLs | ~0.2 s | nothing |
| `npm run test:nuxt` | Composables and components inside a real Nuxt context, Supabase/Apollo faked | ~2 s | nothing |
| `npm test` | unit + nuxt (run this before every commit) | ~2 s | nothing |
| `npm run test:e2e` | Real pages, redirects, sitemap, robots.txt, image proxy against the **real database** | ~15 s | `.env` with Supabase keys |

`test:e2e` starts its own `nuxt dev`. To use a server that is already running (dev on :3000, a prod
preview on :3001, …): `E2E_BASE_URL=http://localhost:3000 npm run test:e2e`.

## Where does a new test go?

- Pure function in `app/utils/` or `app/composables/utils.ts` → `test/unit/`
- Composable (data mapping, filters, "what do we send to the DB") → `test/nuxt/composables.*.test.ts`
- Component (what the user sees) → `test/nuxt/components.test.ts`
- A new page or route → add it to `test/e2e/smoke.test.ts`

## Helpers

- `test/fixtures/shrooms.ts` — GraphQL response shapes copied from the real queries (JSON-string columns etc.).
- `test/helpers/fakeSupabase.ts` — chainable fake of the supabase-js client. It does **not** evaluate filters;
  assert on `callsFor(table, method)` to check what was sent. Real data is the e2e layer's job.
- `test/helpers/mountComposable.ts` — runs a composable inside a component so `onMounted`/`watch` work.
- Mock Nuxt auto-imports with `mockNuxtImport('useAsyncQuery', () => fn)`, modules with `vi.mock('~/supabase', …)`.

## Gotchas

- **Vitest's on-disk module cache is off for the `nuxt` project** (`fsModuleCache: false` in `vitest.config.ts`).
  With it on, every second run fails with `Failed to resolve import "./nuxt.js"`.
- The e2e requests use a bot user agent on purpose: the detail page flags mushrooms in the real database on
  real visits (`needs_photo_review`), tests must not do that. Keep the UA when adding requests.
- `@nuxt/test-utils` only has its server context *inside* tests — don't fetch in `beforeAll`, use the lazy `once()` helper.
- E2E assertions are deliberately loose about data ("at least 5 mushrooms"), strict about structure (titles, redirects, status codes).
