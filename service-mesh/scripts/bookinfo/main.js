(config =>

  pipy({
  
  })
  
  .export('main', {
    __turnDown: false,
    __direction: '',
    __localServiceID: os.env.SERVICE_NAME || '',
  })
  
  //outbound
  .listen(os.env.OUTBOUND_PORT || 9080)
    .handleStreamStart(
      () => __direction = 'outbound'
    )
    .use(config.outboundPlugins, 'session')
    .demuxHTTP('outbound')
  
  .pipeline('outbound')
    .use(
      config.outboundPlugins,
      'request',
      'response',
      () => __turnDown
    )
  
  //inbound
  .listen(
    (+os.env.TARGET_PORT || 8080) +
    (+os.env.LISTEN_HTTP_INBOUND_OFFSET || 10)
  )
    .handleStreamStart(
      () => (
        __direction = 'inbound'
      )
    )
    .use(config.inboundPlugins, 'session')
    .demuxHTTP('inbound')
  
  .pipeline('inbound')
    .use(
      config.inboundPlugins,
      'request',
      'response',
      () => __turnDown
    )
  
  )(JSON.decode(pipy.load('config/main.json')))

.task()
  .use(
    ['plugins/registry.js'],
    'init',
  )
  .replaceMessage(new StreamEnd)