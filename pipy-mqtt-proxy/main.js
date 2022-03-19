(config =>
pipy({
})

.listen(8000)
  .connect(() => config.broker)

.listen(1884)
  .decodeMQTT()
  .demux('request')
  .use('plugins/forward.js', 'request')
  .encodeMQTT()

.pipeline('request')
  .use(
    [
      'plugins/throttle.js',
      'plugins/metrics.js',
    ],
    'request'
    )
)(JSON.decode(pipy.load('config/main.json')))
