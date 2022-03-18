(config =>

pipy({
  _router: new algo.URLRouter(
    Object.fromEntries(
      Object.entries(config.routes).map(
        ([k, v]) => [
          k,
          {
            ...v,
          }
        ]
      )
    )
  ),

  _route: null,
})

.export('router', {
  __serviceID: '',
  __role: '',
})

.pipeline('request')
  .handleMessageStart(
    msg => (
      _route = _router.find(
        msg.head.headers.host,
        msg.head.path,
      ),
      _route && (
        __serviceID = _route.service,
        __role = _route.role
        )
      )
  )

)(JSON.decode(pipy.load('config/router.json')))
