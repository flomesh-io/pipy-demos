pipy()

.import({
  __localServiceID: 'main'
})

.pipeline('request')  //determine balancer from request
  .handleMessageStart(
    msg => //inject local service id into request header for inbound ban of upstream
        msg.head.headers['service-id'] = __localServiceID
  )