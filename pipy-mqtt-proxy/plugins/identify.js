import config from '/config.js'

var $type

export default pipeline($ => $
  .handleMessageStart(msg => $type = msg?.head?.type)
  .pipe(
    function (evt) {
      if ($type != 'CONNECT') {
        return 'bypass' //check connection request ONLY, unnecessary!
      }
      if (evt instanceof MessageEnd) { //clientID exists in payload ONLY
        var clientID = evt.payload.clientID
        if (config?.ids?.deny?.includes(clientID)) {
          return 'deny'
        }
        if (config?.ids?.allow?.length > 0 && !config?.ids?.allow?.includes(clientID)) {
          return 'deny'
        }
        return 'bypass'
      }
      return null

    }, {
    'bypass': $ => $.pipeNext(),
    'deny': $ => $.replaceMessage(
      () => new Message({ type: 'CONNACK', reasonCode: 133, sessionPresent: false }, 'Client Identifier not valid')
    )
  })
)