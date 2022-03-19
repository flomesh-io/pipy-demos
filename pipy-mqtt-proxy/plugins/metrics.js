pipy({
  _publishCounter: new stats.Counter('mqtt_publish_count', ['topic', 'qos']),
})


.pipeline('request')
  .handleMessageStart(
    msg => (
      msg?.head?.type === 'PUBLISH' && (
        _publishCounter.withLabels(msg.head.topicName, msg.head.qos).increase()
      )
    )
  )