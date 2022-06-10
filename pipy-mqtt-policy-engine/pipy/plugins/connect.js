pipy({
    _client: null,
})
.import({
    __reject: 'main',
    __client: 'main',
})
.pipeline('request')
 .handleMessageStart(
     msg => (
        msg?.head?.type === 'CONNECT' && (
        __reject = !(Boolean(__client) && (__client.user == msg?.head?.username &&
            __client.password == msg?.head?.password))
     ))
 )
 .link(
     'deny', () => __reject, 
     'bypass'
 )

 .pipeline('deny')
  .replaceMessage(
    (code) => (
        code = __client ? 134 : 133,
        new Message({type: 'CONNACK', reasonCode: code, sessionPresent: false}, ''))
  )

 .pipeline('bypass')