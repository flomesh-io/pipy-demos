((config, instance, p) => (
  p = pipy({
    _g: {
      _terminated: false,
    },
  })
    .task()
    .use([
      'plugins/registry.js'
    ],
      'init'
    )
    .replaceMessage(new StreamEnd)

    .pipeline('request')
    .use([
      'plugins/log.js',
      'plugins/proxy.js',
    ],
      'request',
      'response',
    ),

  // discovery: convert real ip to 127.x.x.x and offset port by 10
  config?.discovery?.enabled && p.listen(config.discovery?.port || 8771)
    .demuxHTTP('request'),

  //inbound listener
  config?.inbound?.enabled && instance?.spec.containers[0]?.ports && p.listen(+instance?.spec.containers[0]?.ports[0]?.containerPort + 10)
    .connect(`127.0.0.1:${+instance?.spec.containers[0]?.ports[0]?.containerPort}`),

  //outbound listener
  config?.outbound?.enabled && p.listen(config.outbound?.port || 8081), //?
  p
)
)(
  JSON.decode(pipy.load('config/main.json')),
  JSON.decode(pipy.load('config/pod.json'))
)