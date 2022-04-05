((eureka, instance, enabled, router) => (
    router = new algo.URLRouter({
      '/eureka/apps/*': eureka.host,
    }),

    enabled = instance.metadata?.labels && instance.metadata.labels['infra.flomesh.io/registry'] == 'true',
    enabled && instance?.spec.containers[0]?.ports && (
      router.add('/*', `127.0.0.1:${+instance.spec.containers[0].ports[0]?.containerPort}`)
    ),
    pipy({
      
      _target: null
    })
    
    .pipeline('request')
      .handleMessageStart(
        msg => _target = router.find(
            msg.head.headers.host,
            msg.head.path
          )
      )
      .link(
        'forward', () => Boolean(_target),
        ''
        )
    
    .pipeline('forward')
      .muxHTTP('connection', () => () => _target)
      
    .pipeline('connection')
      .connect(
        () => (
          console.log(`connecting to ${_target}`),
          _target
        )
      )
    
    .pipeline('response')    
  )
)(
  JSON.decode(pipy.load('config/eureka.json')),
  JSON.decode(pipy.load('config/pod.json')),
  )