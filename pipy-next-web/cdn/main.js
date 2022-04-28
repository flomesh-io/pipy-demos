(config =>

pipy()

.export('main', {
  __turnDown: false,
  __isTLS: false,
})

.listen(config.listenTLS, {maxConnections: config.maxConnections})
  .handleStreamStart(
    () => __isTLS = true
  )
  .acceptTLS('tls-offloaded', {
    certificate: sni => sni && Object.entries(_cerntificates).find(
      ([k, v]) => new RegExp(k).test(sni)
    )?.[1]
  })
  
.listen(config.listen, {maxConnections: config.maxConnections})
  .link('tls-offloaded')

.pipeline('tls-offloaded')
  .use(config.plugins, 'session')
  .demuxHTTP('request')

.pipeline('request')
  .use(
    config.plugins,
    'request',
    'response',
    () => __turnDown
  )
  .link(
    'bypass', () => __turnDown,
    '404'
    )

.pipeline('404')
  .replaceMessage(
    new Message({status: 404}, 'Page Not Found!')
  )
.pipeline('bypass')

)(JSON.decode(pipy.load('config/main.json')))