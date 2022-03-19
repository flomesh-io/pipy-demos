pipy({
    _router: new algo.URLRouter({
      '/hi/*': 'localhost:8080',
      '/echo': 'localhost:8081',
      '/ip/*': 'localhost:8082',
    }),
  
    _target: '',
  })
  
  .listen(8000)
    .demuxHTTP('request')
  
  .pipeline('request')
    .handleMessageStart(
      msg => (
        _target = _router.find(
          msg.head.headers.host,
          msg.head.path,
        ),
        _target && (
          msg?.head?.headers?.['x-forwarded-for'] ? (
            msg.head.headers['x-forwarded-for'] = `${msg.head.headers['x-forwarded-for']}, ${__inbound.remoteAddress}`
          ) : (
            msg.head.headers['x-forwarded-for'] = __inbound.remoteAddress
          )
        )
      )
    )
    .link(
      'forward', () => Boolean(_target),
      '404'
    )
  
  .pipeline('forward')
    .muxHTTP(
      'connection',
      () => _target
    )  
    .handleMessage(
      msg => (
        msg.head.headers["X-My-Header1"] = 'My header 1',
        msg.head.headers["X-My-Header2"] = 'My header 2'
      )
    )
  
  .pipeline('connection')
    .connect(
      () => _target
    )
  
  .pipeline('404')
    .replaceMessage(
      new Message({ status: 404 }, 'No route')
    )