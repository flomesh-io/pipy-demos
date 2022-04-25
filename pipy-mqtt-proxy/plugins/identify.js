(config =>
pipy()

.import({
  __turnDown: 'main',
})

.pipeline('request')
  .handleMessageStart(
    msg => msg?.head?.type == 'CONNECT' && (
      __turnDown = !Boolean(config.ids.find(el => el == msg?.head?.clientID))
    )
  )
  .link(
    'deny', () => __turnDown,
    'bypass'
    )


.pipeline('bypass')

.pipeline('deny')
  .replaceMessage(
    () => new Message({type: 'CONNACK', reasonCode: 133, sessionPresent: false}, '')
  )  
)(JSON.decode(pipy.load('config/identify.json')))