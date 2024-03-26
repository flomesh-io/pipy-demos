import config from '/config.js'

var balancer = new algo.LoadBalancer(config.brokers, { algorithm: 'round-robin' })

var $ctx
var $conn
export default pipeline($ => $
  .onStart(ctx => void ($ctx = ctx))
  .onEnd(() => $conn.free())
  .handleStreamStart(
    function () {
      $conn = balancer.allocate()
      $ctx.target = $conn.target
    }
  )
  .encodeMQTT()
  .connect(() => $conn.target)
  .decodeMQTT({
    protocolLevel: () => $conn.protocalLevel,
  })
)