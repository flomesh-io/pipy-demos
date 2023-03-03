/**
 * Forward request to upstream.
 */

(config =>
  pipy({
    _balancers: Object.fromEntries(
      Object.entries(config.services).map(
        ([k, v]) => [
          k,
          v ? Object.fromEntries(
            Object.entries(v).map(
              ([ver, eps]) => [ver, new algo.RoundRobinLoadBalancer(eps)]
            )
          ) : null
        ]
      )
    ),
    _target: undefined,  
    _targetCache: null,
    _g: {
      connectionID: 0,
    },
    _connectionPool: new algo.ResourcePool(
      () => ++_g.connectionID
    ),
  })
  
  .import({
    __outboundAddr: 'main',
    __outboundPort: 'main',
    __service: 'router',
  })
  
  .pipeline('session')
    .handleStreamStart(
      () => (
        _targetCache = new algo.Cache(
          // k is a target, v is a connection ID
          (k) => _connectionPool.allocate(k),
          (k, v) => _connectionPool.free(v)
        )
      )
    )
    .handleStreamEnd(() => (
      _targetCache.clear()
    )
  )
  
  .pipeline('request')
    .handleMessageStart(
      () => (
        _target = _balancers[__service.iface]?.[__service.version]?.select(),
        !_target && (_target = `${__outboundAddr}:${__outboundPort+1}`)
      )
    )
    .mux('forward', () => _targetCache.get(_target))
  .pipeline('forward')
    .encodeDubbo()
    .connect(
      () => _target
    )
    .decodeDubbo()  
  )(JSON.decode(pipy.load('config/balancer.json')))