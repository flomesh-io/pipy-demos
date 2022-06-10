pipy({
    _pubReq : false
})
.import({
    __reject: 'main',
    __clientID: 'main',
    __policy: 'main'
})
.pipeline('request')
 .handleMessageStart(
     (msg, topic,allowed, can_publish) => (
        _pubReq = msg?.head?.type === 'PUBLISH',
        _pubReq && __clientID && (
            allowed = __policy.publish[__clientID],
            allowed && (topic = msg?.head?.topicName) && (
                can_publish = allowed.some(r => r.test(topic))
            ),
            __reject =  !can_publish
        )
    )
)
 .link(
     'deny', () => _pubReq && __reject, 
     'bypass'
 )

.pipeline('deny')
 .replaceMessage(
   () => (
       new Message({type: 'PUBACK', reasonCode: 135, sessionPresent: false}, ''))
 )

.pipeline('bypass')