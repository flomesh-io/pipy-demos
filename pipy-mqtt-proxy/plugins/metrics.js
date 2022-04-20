pipy({
  _publishCounter: new stats.Counter('mqtt_publish_count', ['clientID', 'topic', 'qos']),
  _publishACKCounter: new stats.Counter('mqtt_publish_ack_count', ['clientID', 'qos']),
})

.import({
  __connect: 'main',
})

.pipeline('request')
  .handleMessageStart(
    msg => (
      msg?.head?.type === 'PUBLISH' && (
        _publishCounter.withLabels(__connect?.head?.clientID, msg?.head?.topicName, msg?.head?.qos).increase()
      )
    )
  )

.pipeline('response')
  .handleMessageStart(
    msg => (
      _publishACKCounter.withLabels(__connect?.head?.clientID, msg?.head?.qos).increase()
    )
  )