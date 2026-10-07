import { isbot } from 'isbot'
import type { H3Event } from 'h3'

// One JSON log line per function invocation, so `vercel logs --follow --json` (collected on the
// Raspberry Pi, see scripts/monitor/) can tell what costs CPU: page renders vs. image-proxy work vs.
// API/sitemap, and bots vs. people. Requests served from the CDN cache or blocked by the firewall
// never get here.
//
// Logged in `beforeResponse` / `error` on purpose: a line written after the response has finished
// sending often gets lost on Vercel, because the invocation is already over by then.
export default defineNitroPlugin((nitroApp) => {
  const log = (event: H3Event, status: number) => {
    const ua = getRequestHeader(event, 'user-agent') ?? ''
    const path = event.path
    const kind = path.startsWith('/_ipx/') ? 'img'
      // the page render fetching its own translation files / rendering its error page
      : path.startsWith('/_i18n/') || path.startsWith('/__nuxt_error') ? 'internal'
      : path.startsWith('/api/') || path.includes('sitemap') ? 'api'
      : 'page'
    console.log(JSON.stringify({
      reqlog: 1,
      path: path.slice(0, 60),
      kind,
      bot: isbot(ua),
      ua: ua.slice(0, 80),
      status,
      // wall time incl. waiting on Supabase/S3, not pure CPU
      ms: Math.round(performance.now() - (event.context.reqLogStart ?? performance.now())),
    }))
  }

  nitroApp.hooks.hook('request', (event) => {
    event.context.reqLogStart = performance.now()
    // remember the status that actually goes out: some code paths (e.g. the i18n redirect / -> /en)
    // answer directly, after which the renderer still changes res.statusCode and throws
    // ERR_HTTP_HEADERS_SENT — res.statusCode alone would then report a 500 that never happened
    const res = event.node.res
    const writeHead = res.writeHead
    res.writeHead = function (this: typeof res, statusCode: number, ...rest: any[]) {
      event.context.reqLogSentStatus ??= statusCode
      return writeHead.call(this, statusCode, ...rest)
    } as typeof res.writeHead
  })
  nitroApp.hooks.hook('beforeResponse', (event) => {
    log(event, event.context.reqLogSentStatus ?? event.node.res.statusCode)
  })
  nitroApp.hooks.hook('error', (error, { event }) => {
    if (!event) return
    log(event, event.context.reqLogSentStatus ?? (error as { statusCode?: number }).statusCode ?? 500)
  })
})
