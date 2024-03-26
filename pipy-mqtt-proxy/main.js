import config from './config.js'

//init plugins
var plugins = config.plugins.map(
  name => pipy.import(`./plugins/${name}.js`).default
)

var $ctx
var $inbound

var main = pipeline($ => $
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
      $ctx.connMsg = { head: msg.head }
    }
  })
  .handleMessageEnd(
    function (msg) {
      if ($ctx.type == 'CONNECT') {
        $ctx.connMsg.payload = msg.payload
      }
    }
  )
  .pipe(plugins, () => $ctx)
  .encodeMQTT())

if (config.listen) {
  pipy.listen(config.listen, $ => $
    .onStart(ib => void ($inbound = ib))
    .pipe(main)
  )
}

if (config.listenTLS) {
  var cert = new crypto.CertificateChain(
    pipy.load(config.listenTLS.cert)
  )
  var key = new crypto.PrivateKey(
    pipy.load(config.listenTLS.key)
  )
  pipy.listen(config.listenTLS.port, $ => $
    .onStart(ib => void ($inbound = ib))
    .acceptTLS({
      certificate: { cert, key }
    })
    .to(main)
  )
}