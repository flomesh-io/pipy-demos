(config =>
pipy({
  _protocolLevel: 4,
  _balancer: new algo.LeastWorkLoadBalancer(config.brokers),
})

.export('balancer', {
  __target: null,
})

.pipeline('request')
  .handleStreamStart(
    () => __target = _balancer.select()
  )
  .handleStreamEnd(
    () => _balancer.deselect(__target)
  )
  .handleMessageStart(
    msg => (
      msg.head.type === 'CONNECT' && (
        _protocolLevel = msg.head.protocolLevel
      )
    )
  )
  .encodeMQTT()
  .connect(() => __target)
  .decodeMQTT({
    protocolLevel: () => _protocolLevel,
  })
)(JSON.decode(pipy.load('config/balancer.json')))  