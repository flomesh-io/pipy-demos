(config =>
pipy({
  _type: '', // CONNECT/PUBLISH/SUBSCRIBE
})

.pipeline('request')
  .handleMessageStart(
    msg => _type = msg.head.type
  )
  .link(
    'conn-throttle', () => _type === 'CONNECT' && Boolean(config?.connRate),
    'pub-throttle', () => _type === 'PUBLISH' && Boolean(config?.pubRate),
    'bypass'
  )
  
.pipeline('conn-throttle')
  .throttleMessageRate(()=> config.connRate)


.pipeline('pub-throttle')
  .throttleMessageRate(() => config.pubRate, () => __inbound)

.pipeline('bypass')  

)(JSON.decode(pipy.load('config/throttle.json')))