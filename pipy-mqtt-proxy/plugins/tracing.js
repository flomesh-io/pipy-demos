import config from '/config.js'

var key = config?.tracing?.key ? config.tracing.key : 'traceid'

var $traceid 

export default pipeline($=>$
  .handleMessageStart(
    function(msg) {
      $traceid = msg?.head?.properties?.[key]
      if (!$traceid) {
        $traceid = algo.uuid().substring(0, 18).replaceAll('-', '')
        msg.head.properties[key] = $traceid
      }
    }
  )
  .pipeNext()
  .handleMessageStart(
    function(msg) {
      if (!msg?.head?.properties ) {
        msg.head.properties = {}
      }
      msg.head.properties[key] = $traceid
    }
  )
)