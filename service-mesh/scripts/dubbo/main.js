(config =>
pipy({
  _direction: '',
})

.export('main', {
  __outboundAddr: '',
  __outboundPort: '',
  __turnDown: false,
})
//OUTBOUND
.listen(1080)
  .acceptSOCKS(
    'outbound', 
    (addr, port) => (
      __outboundAddr = addr,
      __outboundPort = port,
      true
    )
  )

.pipeline('outbound')
  .link(
    'outbound-middleware', () => __outboundPort === 2181 || __outboundPort === 5672 || __outboundPort === 6379 || __outboundPort === 3306,
    'outbound-dubbo'
  )

.pipeline('outbound-middleware')
  .connect(
    () => `${__outboundAddr}:${__outboundPort}`
  )

.pipeline('outbound-dubbo')
  .use(config.outboundPlugins, 'session')
  .decodeDubbo()
  .demux('outbound-go')
  .encodeDubbo()

.pipeline('outbound-go')
  .handleStreamStart(
    () => (_direction = 'outbound')
  )
  .use(
    config.outboundPlugins,
    'request',
    'response',
    () => __turnDown
  )
//INBOUND
.listen(20881)
  .use(config.inboundPlugins, 'session')
  .decodeDubbo()
  .demux('inbound')
  .encodeDubbo()

.pipeline('inbound')
  .use(
    config.inboundPlugins,
    'request',
    'response',
    () => __turnDown
  )
//TASK
.task()
  .use(config.tasks, 'init')
  .replaceMessage(new StreamEnd)

)(JSON.decode(pipy.load('config/main.json')))