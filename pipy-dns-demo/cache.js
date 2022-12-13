(
  (
    dnsCache = new algo.Cache(null, null, { ttl: 600 }),
  ) => (
    {
      setDNS: (key, record) => (
        (ttl = 600) => (
          record.rr.map(
            rr => (
              (rr.ttl < ttl) && (ttl = rr.ttl)
            )
          ),
          dnsCache.set(key.toLowerCase(), { ts: Date.now(), ttl: ttl * 1000, record })
        )
      )(),

      getDNS: key => (
        (
          lowerKey = key.toLowerCase(),
          rr = dnsCache.get(lowerKey),
          ts = Date.now(),
        ) => (
          rr?.ttl && (
            (rr.ttl + rr.ts > ts) && (
              (
                obj = Object.assign({}, rr.record),
                dec = Math.floor((ts - rr.ts) / 1000),
              ) => (
                obj.rr = obj.rr.map(
                  o => (
                    (
                      t = Object.assign({}, o)
                    ) => (
                      t.ttl -= dec,
                      t
                    )
                  )()
                ),
                obj
              )
            )() || (
              dnsCache.remove(lowerKey),
              null
            )
          )
        )
      )(),

      clear: () => dnsCache.clear()
    }
  )
)()