(
  (
    { config } = pipy.solve('config.js'),

    isDebugEnabled = config?.global?.enableDebug,

    cacheTTL = ((val = config?.tunnel?.healthcheck?.target?.interval) => (
      (val?.indexOf?.('s') > 0) && (
        val.replace('s', '') * 2 + 's'
      ) ||
      (val?.indexOf?.('m') > 0) && (
        val.replace('m', '') * 2 + 'm'
      ) ||
      '60s'
    ))(),

    slotCount = ((val = config?.tunnel?.healthcheck?.target?.interval) => (
      (val?.indexOf?.('s') > 0) && (
        val.replace('s', '') * 1
      ) ||
      (val?.indexOf?.('m') > 0) && (
        val.replace('m', '') * 60
      ) ||
      60
    ))(),

    slotArray = [],

    listIssuingCA = [],

    fullTargetStructs = {},

    serverTargetStructs = {},

    unhealthyTargetCache = new algo.Cache(),

    unhealthyTargetTTLCache = new algo.Cache(null, null, { ttl: cacheTTL }),

    tunnelServers = Object.fromEntries(
      Object.entries(config?.tunnel?.servers || {}).map(
        ([k, v]) => [
          k,
          {
            name: v.name || k,
            target: k,
            shadowPort: v.shadowPort,
            weight: v.weight > 0 ? v.weight : 0,
            tlsCert: v.tlsCert && new crypto.Certificate(pipy.load(v.tlsCert)),
            tlsKey: v.tlsKey && new crypto.PrivateKey(pipy.load(v.tlsKey)),
            tlsCA: v.tlsCA && listIssuingCA.push(new crypto.Certificate(pipy.load(v.tlsCA))),
          }
        ]
      )
    ),

    loadBalancers = (
      (slotIndex = 0) => (
        Object.fromEntries(
          Object.entries(config?.loadBalancers || {}).map(
            ([k, v]) => [
              k,
              ((key, weight, targets = {}) => (
                Object.entries(v?.targets || {}).map(
                  ([t, w]) => (
                    Object.entries(tunnelServers || {}).map(
                      ([s, n]) => (
                        key = t + '@' + s,
                        weight = w * n.weight,
                        (weight > 0) && (
                          targets[key] = weight,
                          fullTargetStructs[key] = { key, name: k, path: t, load: v, server: n },
                          !serverTargetStructs[s] && (serverTargetStructs[s] = []),
                          serverTargetStructs[s].push(key),
                          !slotArray[slotIndex] && (slotArray[slotIndex] = []),
                          slotArray[slotIndex].push(fullTargetStructs[key]),
                          slotIndex = (slotIndex + 1) % slotCount
                        )
                      )
                    )
                  )
                ),
                v.mode === 'rr' && (
                  new algo.RoundRobinLoadBalancer(
                    targets, unhealthyTargetCache
                  )) ||
                v.mode === 'lc' && (
                  new algo.LeastWorkLoadBalancer(
                    targets, unhealthyTargetCache
                  )) ||
                v.mode === 'ch' && (
                  new algo.HashingLoadBalancer(
                    Object.keys(targets), unhealthyTargetCache
                  )
                )
              ))()
            ]
          )
        )
      )
    )(),

  ) => (
    {
      isDebugEnabled,
      slotCount,
      slotArray,
      listIssuingCA,
      tunnelServers,
      fullTargetStructs,
      serverTargetStructs,
      unhealthyTargetCache,
      unhealthyTargetTTLCache,
      loadBalancers,
    }
  )

)()