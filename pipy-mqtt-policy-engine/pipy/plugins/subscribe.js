pipy({
    _subReq : false
})
.import({
    __reject: 'main',
    __clientID: 'main',
   __policy: 'main'
})
.pipeline('request')
 .handleMessageStart(
     (msg, topics,allowed, allowed_topics) => (
        _subReq = msg?.head?.type === 'SUBSCRIBE',
        _subReq && __clientID && (
            allowed = __policy.subscribe[__clientID],
            allowed && (topics = msg?.head?.topicFilters) && (
            allowed_topics = topics.map(t => allowed.some(r => r.test(t.filter)))
            ),
            __reject =  !(allowed_topics  && allowed_topics.filter(t => t).length > 0)
        )
    )
)
 .link(
     'deny', () => _subReq && __reject, 
     'bypass'
 )

.pipeline('deny')
 .replaceMessage(
   () => (
       new Message({type: 'SUBACK', reasonCode: 135, sessionPresent: false}, ''))
 )

.pipeline('bypass')