var $publishCounter = new stats.Counter('mqtt_publish_count', ['clientID', 'topic', 'qos'])
var $publishACKCounter = new stats.Counter('mqtt_publish_ack_count', ['clientID', 'qos'])

var $ctx
export default pipeline($ => $
  .onStart(ctx => void ($ctx = ctx))
  .handleMessageStart(
    function (msg) {
      msg?.head?.type === 'PUBLISH' && (
        $publishCounter.withLabels($ctx.connMsg?.head?.clientID, msg?.head?.topicName, msg?.head?.qos).increase()
      )
    }
  )
  .pipeNext()
  .handleMessageStart(
    function (msg) {
      $publishACKCounter.withLabels($ctx.connMsg?.head?.clientID, msg?.head?.qos).increase()
    }
  )
)