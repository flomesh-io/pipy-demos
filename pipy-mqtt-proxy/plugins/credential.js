(config =>
  pipy()

.import({
  __turnDown: 'main',
})
  
.pipeline('request')
  .handleMessageStart(
    msg => msg?.head?.type == 'CONNECT' && (
      __turnDown = !msg?.head?.username || !Boolean(config.creds[msg?.head?.username] == msg?.head?.password)
    )
  )
  .link(
    'deny', () => __turnDown,
    'bypass'
    )

.pipeline('bypass')

.pipeline('deny')
  .replaceMessage(
    () => new Message({type: 'CONNACK', reasonCode: 134, sessionPresent: false}, '')
  )  
)(JSON.decode(pipy.load('config/credential.json')))