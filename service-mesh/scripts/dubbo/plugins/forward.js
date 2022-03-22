/**
 * Forward request to upstream.
 */

pipy({
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
  __outboundPort: 'main'
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
    () => _target = `${__outboundAddr}:${__outboundPort+1}`
  )
  .mux('forward', () => _targetCache.get(_target))
  // .handleMessage(
  //   msg => (
  //     console.log(`msg.head: ${JSON.stringify(msg.head)}`),
  //     console.log(`msg.body: ${JSON.stringify(Hessian.decode(msg.body))}`)
  //   )
  // )
.pipeline('forward')
  .encodeDubbo()
  .connect(
    () => _target
  )
  .decodeDubbo()