(config =>
pipy({

})

.export('main', {
  __connect: null,
})

.listen(8000)
  .connect(() => config.broker)

.listen(1884)
  .decodeMQTT()
  .handleMessageStart(
    msg => msg?.head?.type == 'CONNECT' && (__connect = msg)
  )
  .demux('request')
  .use('plugins/balancer.js', 'request')
  .demux('response')
  .encodeMQTT()

.pipeline('request')
  .use(config.plugins, 'request')

.pipeline('response')
  .use(config.plugins.reverse(), 'response')  

)(JSON.decode(pipy.load('config/main.json')))
