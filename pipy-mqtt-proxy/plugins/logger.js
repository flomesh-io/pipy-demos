pipy({
})

.import({
  __connect: 'main',
  __target: 'balancer',
})

.pipeline('request')
  .fork('log-req')
  
.pipeline('response')
  .fork('log-res')

.pipeline('log-req')
  .link('log-send')
  
.pipeline('log-res')
  .link('log-send')

.pipeline('log-send')
  .replaceMessage(
    msg => new Message(
      JSON.encode({
        clientID: __connect?.head?.clientID,
        ...msg?.head,
        broker: __target,
        timestamp: Date.now()
        //
      }).push('\n')
    ) 
  )
  .merge('sink', '')

  .pipeline('sink')
    .pack(
      1000,
      {
        timeout: 2
      }
    )
    .handleMessage(
      msg => console.log(msg?.body)
    )
