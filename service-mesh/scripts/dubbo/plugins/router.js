/**
 * Remote service detecting: interface:method(args)
 */

(config =>
pipy({
  _routes: Object.fromEntries(
    Object.entries(config.services).map(
      ([k, v]) => [
        k,
        v ? new algo.RoundRobinLoadBalancer(v) : null
      ]
    )
  ),
})

.import({
  __turnDown: 'main'
})

.export('router', {
  __serviceID: '',
  __service: null,
})

.pipeline('request')
  .handleMessage(
    msg => (
      (iface, version, method, args, reqBody, attachments) => (
        reqBody = Hessian.decode(msg.body),
        iface = reqBody?.[1],
        version = reqBody?.[2],
        method = reqBody?.[3],
        args = reqBody?.[4] || '',
        attachments = reqBody?.pop && reqBody.pop(),
        (iface != undefined && method != undefined) ? (
          __service = {
            iface: iface,
            version: version,
            method: method,
            args: args,
            remote: attachments?.['remote.application']
          },
          _routes[iface] && ( __service.version = _routes[iface]?.select()),
          __serviceID = `${iface}:${method}(${args})`
        ) : (
          __turnDown = true
        )
    ))()
  )
)(JSON.decode(pipy.load('config/router.json')))