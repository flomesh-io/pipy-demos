(config =>
pipy({
  _protocolLevel: 4,
  _target: null,
  _balancer: new algo.LeastWorkLoadBalancer(config.brokers),
})

.pipeline('request')
  .handleStreamStart(
    () => _target = _balancer.select()
  )
  .handleStreamEnd(
    () => _balancer.deselect(_target)
  )
  .handleMessageStart(
    msg => (
      msg.head.type === 'CONNECT' && (
        _protocolLevel = msg.head.protocolLevel
      )
    )
  )
  .encodeMQTT()
  .connect(() => _target)
  .decodeMQTT({
    protocolLevel: () => _protocolLevel,
  })
)(JSON.decode(pipy.load('config/balancer.json')))
