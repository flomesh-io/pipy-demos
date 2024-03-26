import config from '/config.js'

var $ctx
var $clientID

export default pipeline($ => $
  .onStart(ctx => void ($ctx = ctx))
  .handleMessageStart(
    msg => void ($clientID = msg?.head?.clientID)
  )
  .pipe(
    function () {
      if ($ctx.type == 'CONNECT') {
        if (config?.ids?.deny?.includes($clientID)) {
          return 'deny'
        }
        if (config?.ids?.allow?.length > 0 && !config?.ids?.allow?.includes($clientID)) {
          return 'deny'
        }
      }
      return 'bypass'
    }, {
    'bypass': $ => $.pipeNext(),
    'deny': $ => $.replaceMessage(
      () => new Message({ type: 'CONNACK', reasonCode: 133, sessionPresent: false }, 'Client Identifier not valid')
    )
  })
)