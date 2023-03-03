/**
 * ban is iface leve, but support service, method and method signature level too.
 */
(config =>
pipy({
  _ifaces: Object.fromEntries(
    Object.entries(config.ifaces).map(
      ([k,v]) => [
        k,
        {
          black: v.black.length > 0 ? Object.fromEntries(v.black.map(app => [app, true])) : null,
          white: v.white.length > 0 ? Object.fromEntries(v.white.map(app => [app, true])) : null
        }
      ]
    )
  ),
  _iface: null,
  _requestCounter: new stats.Counter('dubbo_ban_denied', ['service', 'version'])
})

.import({
  __turnDown: 'main',
  __service: 'router',
  __serviceID: 'router',
})

.pipeline('request')
  .handleMessage(
    msg => __service && (

      _iface = _ifaces[__service.iface],
      __turnDown = _iface && (
        _iface.white ? (
            !_iface.white[__service.remote]
        ) : (
          _iface.black?.[__service.remote]
        )
      ),
      __turnDown && _requestCounter.withLabels(__serviceID, __service.version).increase()
    )
  )
  .replaceMessage(
    msg => __turnDown ? (
            //https://dubbo.apache.org/en/blog/2018/10/05/introduction-to-the-dubbo-protocol/#dubbo-protocol-details
            new Message({
              ...msg.head,
              isRequest: false,
              isTwoWay: false,
              isEvent: false,
              status: 40//BAD_REQUEST
              }, Hessian.encode([403, 'Request denied'])) //customize error code
          ): (
            msg
          )
  )
  
)(JSON.decode(pipy.load('config/inbound/ban.json')))