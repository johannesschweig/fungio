// Minimal stand-in for the supabase-js client used in app/composables/composables.ts.
// Queries are chainable and awaitable, like the real builder. Filters are NOT evaluated — a table
// simply resolves with whatever the test put in `tables`; tests assert on `calls` to check that the
// right filters were sent (the database itself is covered by the e2e smoke tests).

type Result = { data: any, error: any }

export function createFakeSupabase() {
  const tables: Record<string, Result> = {}
  const rpcs: Record<string, Result> = {}
  const calls: { table: string, method: string, args: any[] }[] = []

  const from = (table: string) => {
    let single = false
    const builder: any = {}
    for (const method of ['select', 'update', 'eq', 'in', 'filter', 'order', 'range']) {
      builder[method] = (...args: any[]) => {
        calls.push({ table, method, args })
        return builder
      }
    }
    builder.single = () => {
      calls.push({ table, method: 'single', args: [] })
      single = true
      return builder
    }
    builder.then = (resolve: any, reject: any) => {
      const { data = [], error = null } = tables[table] ?? {}
      const out = single ? { data: Array.isArray(data) ? (data[0] ?? null) : data, error } : { data, error }
      return Promise.resolve(out).then(resolve, reject)
    }
    return builder
  }

  const rpc = (name: string, args?: any) => {
    calls.push({ table: `rpc:${name}`, method: 'rpc', args: [args] })
    return Promise.resolve(rpcs[name] ?? { data: [], error: null })
  }

  return {
    from,
    rpc,
    // test helpers
    setTable: (table: string, data: any, error: any = null) => { tables[table] = { data, error } },
    setRpc: (name: string, data: any, error: any = null) => { rpcs[name] = { data, error } },
    callsFor: (table: string, method?: string) => calls.filter(c => c.table === table && (!method || c.method === method)),
    reset: () => {
      for (const key of Object.keys(tables)) delete tables[key]
      for (const key of Object.keys(rpcs)) delete rpcs[key]
      calls.length = 0
    },
  }
}
