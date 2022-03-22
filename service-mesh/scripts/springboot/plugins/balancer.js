(config =>
pipy({
  _balancer: {},
  _balancerCache: null,
  _target: undefined,
  _targetCache: null,
  _g: {
    connectionID: 0,
  },
  _connectionPool: new algo.ResourcePool(
    () => ++_g.connectionID
  ),
})

.export('balancer', {
  __balancers: {}
})

.import({
  __turnDown: 'main',
  __serviceID: 'router',
})

.pipeline('session')
  .handleStreamStart(
    () => (
      _balancerCache = new algo.Cache(
        // k is a balancer, v is a target
        (k) => k.select(),
        (k, v) => k.deselect(v)
      ),
      _targetCache = new algo.Cache(
        // k is a target, v is a connection ID
        (k) => _connectionPool.allocate(k),
        (k, v) => _connectionPool.free(v)
      )
    )
  )
  .handleStreamEnd(() => (
      _targetCache.clear(),
      _balancerCache.clear()
    )
  )

.pipeline('request')
  .handleMessageStart(
    () => (
      _balancer = __balancers[__serviceID],
      _balancer && (__turnDown = true)
    )
  )
  .link('load-balance', () => Boolean(_balancer), '')

.pipeline('load-balance')
  .handleMessageStart(
    () => (
      _target = _balancerCache.get(_balancer),
      console.log(`balancing ${__serviceID} to ${_target}` )
    )
  )
  .link(
    'forward', () => Boolean(_target), 
    ''
    )

.pipeline('forward')
  .muxHTTP('connection', () => _targetCache.get(_target))

.pipeline('connection')
  .connect(() => _target)

)(JSON.decode(pipy.load('config/balancer.json')))