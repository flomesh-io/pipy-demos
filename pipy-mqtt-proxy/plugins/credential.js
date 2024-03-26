import config from '/config.js'

var $type

export default pipeline($ => $
  .handleMessageStart(msg => $type = msg?.head?.type)
  .pipe(function (evt) {
    if ($type != 'CONNECT') {
      return 'bypass' //check connection request ONLY, unnecessary!
    }
    if (evt instanceof MessageEnd) {//clientID exists in payload ONLY
      var username = evt?.payload?.username
      var password = evt?.payload?.password?.toString()
      if (!username || !(config?.creds?.username === username && config?.creds?.password === password)) {
        return 'deny'
      }
      return 'bypass'
    }
    return null

  }, {
    'bypass': $ => $.pipeNext(),
    'deny': $ => $.replaceMessage(
      () => new Message({ type: 'CONNACK', reasonCode: 134, sessionPresent: false }, 'Bad User Name or Password')
    )
  })
)