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
      console.log(`$username: ${JSON.stringify($username)}`)
      console.log(`$password: ${JSON.stringify($password)}`)
      if (!$username || config.creds[$username] !== $password) {
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