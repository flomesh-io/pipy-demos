(config =>

  pipy({
    _ss: Object.fromEntries(
      Object.entries(config.services).map(
        ([k, v]) => [
          k,
          v && v.http ? {
            http: v.http.map(
              h => h.routes.length > 0 ? (
                {
                  matches: h.matches?.length > 0 ? (
                    h.matches.map(
                      match => ({
                        "type": match.type,
                        "name": match.name,
                        "reg": new RegExp(match.reg)
                      })
                    )
                ) : null,
                  routes: new algo.RoundRobinLoadBalancer(Object.fromEntries(
                    h.routes.map(
                      r => [r.service, r.weight !== null ? r.weight : 100]
                    )
                  ))
                }
              ): null
            )
          } : null
        ]
      )
    ),
    _service: null,
  })
  
  .export('router', {
    __services: {},
    __serviceID: '',
  })
  
  .import({
    __localServiceID: 'main'
  })
  .pipeline('request')

    .handleMessageStart( // determine balancer from request
      msg => (
        (routes, route) => (
          // determine service id from request
          __serviceID = msg.head.headers.host.split(':')[0],
          _service = _ss[__serviceID],
          //check matches route
          routes = _service && _service.http && (
            _service.http.find(
              e => (
                Boolean(e.matches) && e.matches.every(
                  match => (
                    match.type == 'header' && msg.head.headers[match.name] && match.reg.test(msg.head.headers[match.name]) // TODO: check other match types
                    || match.type == 'path' && msg.head.path && match.reg.test(msg.head.path)
                    || match.type == 'method' && msg.head.method && match.reg.test(msg.head.method)
                  )
                )
              )
            )
            )?.routes,
  
          !routes && ( //check default routes
            routes =  _service && _service.http && _service.http.find(
              e => !Boolean(e.matches)
            )?.routes
          ),
          
          route = routes ? (
            routes.select()
          ) : null,
          route && (__serviceID = route)
        )
      )()
    )
  
  )(JSON.decode(pipy.load('config/router.json')))