# Fungio

German-language mushroom guide at fungio.de. Nuxt 4 / Vue 3 app, Supabase backend (Postgres + PostgREST + pg_graphql), Pinia for global state, Tailwind for styling.

This repo is public. The data pipeline lives in a separate private repo (`../fungio-data`); cross-repo context is in the parent folder's `CLAUDE.md`. Write all code, comments, docs and commit messages in English; only user-facing site content is German.

## Stack & structure

- **Nuxt 4** (`app/` as source directory), Vue 3 `<script setup>`.
- **Supabase**: two access paths in parallel.
  - GraphQL (`@nuxtjs/apollo`, `useAsyncQuery`/`useLazyQuery`) for most reads. Queries live in `app/composables/queries.ts`.
  - REST via `@supabase/supabase-js` (client in `app/supabase.ts`) for what pg_graphql can't express, e.g. resolving taxonomy from `ancestry` strings in `app/composables/composables.ts`.
- **Core composables**: `app/composables/composables.ts` (data access / business logic), `app/composables/queries.ts` (GraphQL queries), `app/composables/utils.ts` (`flattenFungi` etc., which reshape the GraphQL response into the `Shroom` type).
- **State**: `app/stores/store.ts` (Pinia: global search `store.search`, filters).
- **Pages**: `app/pages/`: mushroom detail (`mushroom/[id].vue`), taxonomy (`taxa/`, based on `ancestry` paths in the `fungi` table), overviews by letter / season / region / top edible mushrooms.
- **Migrations**: `app/migrations/*.sql` are loose SQL snippets (no migration tool), run manually in the Supabase SQL editor. Add new snippets there but never execute them automatically (see below).
- **AUDIT.md** (repo root): numbered list of technical inefficiencies (caching, data access, bundle, images) with measurements and a suggested fix. Tick off finished items (`[x]` + date and commit title), never renumber. "Do item N" refers to this list.
- **TODO.md** (repo root): running task list (`TODO` / `NOTES` / `DONE` / `DROPPED`). When a task is finished, move it from `TODO` to `DONE` with a short note on what was done; don't just delete it.

## Tests

Vitest + `@nuxt/test-utils`, three levels (details and pitfalls in `test/README.md`):

- `npm test`: unit + Nuxt tests (composables/components with faked Supabase/Apollo), ~2 s, needs nothing. **Run before every commit**; add matching tests when changing logic, composables or components.
- `npm run test:e2e`: smoke tests against real pages and the real DB (read-only). Starts its own `nuxt dev`, or runs against a running server: `E2E_BASE_URL=http://localhost:3000 npm run test:e2e`. Run after changes to pages, routes, sitemap, robots.txt or the image proxy.
- E2E requests deliberately send a bot user agent so they don't set `needs_photo_review` in the real DB.

## Gotchas

- **`VITE_SUPABASE_SERVICE_ROLE_KEY`** in `.env` is, despite its name, **not a real service-role key** but an `sb_publishable_...` key (Supabase's new key system, successor to the old `anon` key). It is subject to RLS and may end up in the client bundle; it is not "god mode". Writes this key should be able to do need an explicit RLS policy (+ column grant if needed). See `app/migrations/fungi_needs_photo_review.sql` as the pattern: the policy allows only `false → true` on a single column, no reset, no access to other columns.
- Claude cannot run DDL (`ALTER TABLE`, `CREATE POLICY`, ...), only test `SELECT`/`PATCH` over the REST API. Database changes must be run by the user in the Supabase SQL editor.
- **Bot traffic**: SSR requests run the same for crawlers as for real users. Where it matters (e.g. tracking or flags that should only be set on real visits), filter server-side with `isbot` (`app/composables/composables.ts`, `isBotRequest()`).
- **Taxonomy**: the `taxa` table has no parent/child column. Ancestry is derived from the `ancestry` string (`/`-separated ID chain) on the `fungi` table (iNaturalist convention). Rank level constants: 10 = species, 20 = genus, 30 = family, 40 = order (see `useTaxonPage`/`useAllOrders`).
- **Photos**: the `photos` table has `fungi_id`, `url`, `quality_score` (the photo pipeline scores images externally). `needs_photo_review` (bool, `fungi` table) flags mushrooms without scored photos for that pipeline.
- **Image URLs**: `getInaturalistImageUrl()` in `app/utils/utils.ts` replaces `square` in the path with the requested size (`small`/`medium`/`large`). ALWAYS give the `photos` query an explicit `.order('id')`, otherwise PostgREST may return a different order than the GraphQL queries (which sort by `id` implicitly).

## Workflow

- **Dev server**: often already running externally (user's terminal) on port 3000. Check before `preview_start`; on "Port already in use" just navigate to `localhost:3000` instead of starting a second server.
- For database questions or analyses, direct REST calls against Supabase (`curl` with the keys from `.env`) are the quickest route; no extra scripts needed.
- **Mobile check**: always check UI changes in a mobile viewport too (`resize_window` with preset `mobile`), not only desktop, then reset to `desktop`.
