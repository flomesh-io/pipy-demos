import config from '/config.js'

var $connQuota = new algo.Quota(Number.parseFloat(config.limits.conn.rate), { per: 1, blockInput: config.limits.conn.blockInput })
var $pubQuota = new algo.Quota(Number.parseFloat(config.limits.pub.rate), { per: 1, blockInput: config.limits.pub.blockInput })

var $ctx
export default pipeline($ => $
  .onStart(ctx => void ($ctx = ctx))
  .pipe(
    function () {
      switch ($ctx.type) {
        case 'CONNECT': return 'conn-throttle'
        case 'PUBLISH': return 'pub-throttle'
        default: return 'bypass'
      }
    }, {
    'conn-throttle': $ => $
      .throttleMessageRate(function(){
        return $connQuota
      })
      .pipeNext()
    ,
    'pub-throttle': $ => $
      .throttleMessageRate(() => $pubQuota)
      .pipeNext()
    ,
    'bypass': $ => $.pipeNext()
  })
)