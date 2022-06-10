((config, policy) =>
    pipy({
      _output : null,
      _regex : new RegExp('[|\\\\{}()[\\]^$+?.]','g'),
      _func : obj => (
        Object.fromEntries(
          Object.entries(obj).map(
            ([k,v]) => [
              k, v.map(r => new RegExp(r.replace(_regex, '\\$&')))
            ]
          )
        )
      )
    })
    .export('main', {
        __reject: false,
        __client: null,
        __clientID: null,
        __policy : {
            subscribe:  null,
            publish: null
          }
    })
    .listen(config.listen)
      .decodeMQTT({
        protocolLevel : 5
      })
      .handleMessageStart(
        msg => (
          msg.head?.type === 'CONNECT' && (
          __clientID = msg.head?.clientID,
          __client = policy.CONNECT.clients[__clientID])
          )
      )
      .input(out => _output = out).to(p => p
          .demux().to(p => p
            .use(config.plugins, 'request')
            .link(
              'deny', () => __reject,
              'proxy'
            )
          )
          .output()
      )
      .use(["plugins/log-metrics.js"],'request')
      .encodeMQTT()

    .pipeline('deny')
      .output(() => _output)

    .pipeline('proxy')
      .mux().to(p => p
        .encodeMQTT()
        .connect(() => config.broker)
        .decodeMQTT({
          protocolLevel : 5
        })
        .output(() => _output)
      )
      .replaceMessage(new StreamEnd)

    .task()
      .handleStreamStart(
       () => (
        __policy.subscribe = _func(policy.SUBSCRIBE),
        __policy.publish = _func(policy.PUBLISH)
      )
    )
)(JSON.decode(pipy.load('config/config.json')), JSON.decode(pipy.load('config/policy.json')))
