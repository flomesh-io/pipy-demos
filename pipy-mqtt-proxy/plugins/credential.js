import config from '/config.js'

var $ctx
var $username
var $password


export default pipeline($ => $
  .onStart(ctx => void ($ctx = ctx))
  .handleMessageStart(
    function (msg) {
      $username = msg?.head?.username
      $password = msg?.head?.password
    }
  ).pipe(function() {
    if ($ctx.type == 'CONNECT') {
      if (!$username || !(config?.creds?.username === $username && config?.creds?.password === $password)) {
        return 'deny'
      }
    }
    return 'bypass'
  },{
    'bypass': $ => $.pipeNext(),
    'deny': $ => $.replaceMessage(
      () => new Message({ type: 'CONNACK', reasonCode: 134, sessionPresent: false }, 'Bad User Name or Password')
    )
  })
)