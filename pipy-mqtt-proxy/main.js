(config =>
pipy()

.export('main', {
  __connect: null,
  __turnDown: false,
})

.listen(8000)
  .connect(() => config.broker)

.listen(1884)
  .decodeMQTT()
  .handleMessageStart(
    msg => msg?.head?.type == 'CONNECT' && (__connect = msg)
  )
  .demux('request')
  .handleMessageStart(
    msg => __turnDown = (msg.head.type == 'CONNACK' || msg.head.type == 'PUBACK' || msg.head.type == 'SUBACK')
  )
  .use(['plugins/balancer.js'], 'request', () => __turnDown)
  .demux('response')
  .encodeMQTT()

.pipeline('request')
  .use(config.plugins, 'request', () => __turnDown)

.pipeline('response')
  .use(config.plugins.reverse(), 'response')

)(JSON.decode(pipy.load('config/main.json')))
