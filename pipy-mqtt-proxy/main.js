import config from './config.js'
import balancer from './plugins/balancer.js'

//init plugins
var plugins = config.plugins.map(
  name => pipy.import(`./plugins/${name}.js`).default
)

var $ctx
var $inbound
pipy.listen(8000, $ => $.connect('localhost:1883'))

pipy.listen(config.listen, $ => $
  .onStart(ib => void ($inbound = ib))
  .decodeMQTT()
  .handleMessageStart(function (msg) {
    $ctx = {
      protocalLevel: msg.head.protocolLevel,
      type: msg?.head?.type,
      target: null,
      inbound: $inbound,
    }
    //record connection message
    if (msg?.head?.type == 'CONNECT') {
      $ctx.connMsg = msg
    }
  })
  .pipe(plugins, () => $ctx)
  .encodeMQTT()
)