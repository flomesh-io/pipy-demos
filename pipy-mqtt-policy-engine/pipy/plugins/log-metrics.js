pipy({
    _pubCounter : new stats.Counter('mqtt_publish_count', ['clientID', 'topicName', 'qos']),
    _subCounter : new stats.Counter('mqtt_subscribe_count', ['clientID', 'topicName', 'qos']),
    _ackCounter : new stats.Counter('mqtt_ack_count', ['clientID','type','reasonCode','reasonCodes']),
    _rejCounter : new stats.Counter('mqtt_reject_count', ['clientID', 'type','reasonCode'])
})
.import({
    __reject: 'main',
    __clientID: 'main'
  })

.pipeline('request')
 .handleMessageStart(
     (msg,rcs) => (
         msg?.head?.type === 'PUBLISH' && _pubCounter.withLabels(__clientID, msg?.head?.topicName, msg?.head?.qos).increase(),
         msg?.head?.type === 'SUBSCRIBE' && (
            msg?.head?.topicFilters.forEach(t => 
             _subCounter.withLabels(__clientID, t.filter, t.qos).increase()
            )
         ),
         msg?.head?.type.endsWith('ACK') && _ackCounter.withLabels(__clientID,msg?.head?.type, msg?.head?.reasonCode || '0',
          ((rcs = msg?.head?.reasonCodes) && rcs.join()) || '').increase(),
         __reject && _rejCounter.withLabels(__clientID, msg?.head?.type, msg?.head?.reasonCode || '0',
         ((rcs = msg?.head?.reasonCodes) && rcs.join()) || '').increase()
     )
 )