#!/usr/bin/env pipy
var config = YAML.decode(pipy.load('config.yaml'))
var services = config.services
var logURL = config.logging.url
var dubboLogger = new logging.JSONLogger('dubbo')
dubboLogger.toHTTP(`${logURL}/dubbo/_doc`, {
  headers: { "Content-Type": "application/json" }
})

var httpLogger = new logging.JSONLogger('http')
httpLogger.toHTTP(`${logURL}/http/_doc`, {
  headers: { "Content-Type": "application/json" }
})


var logDubbo = function (msg) {
  var c = Hessian.decode(msg.body)
  var args = []
  c.slice(4).forEach(i => {
    if (typeof i != 'object') {
      args.push(i)
    }
  })
  dubboLogger.log({
    time: Date.now(),
    dubboVer: c[0],
    interface: c[1],
    ver: c[2],
    method: c[3],
    args: args,
    raw: JSON.stringify(c)
  })
}

var logHTTP = function (msg) {
  var headers = msg.head.headers
  httpLogger.log({
    time: Date.now(),
    host: headers.host,
    path: msg.head.path,
    headers: JSON.stringify(headers)
  })
}

var dumpDubbo = pipeline($ => $
  .decodeDubbo()
  .handleMessage(logDubbo)
)

var dumpHTTP = pipeline($ => $
  .decodeHTTPRequest()
  .handleMessageStart(logHTTP)
)

services.forEach(({ port, originalPort, type }) => {
  if(type === 'http') {
    pipy.listen(port, $ => $
      .fork().to(dumpHTTP)
      .connect(() => `localhost:${originalPort}`)
    )
  } else if (type === 'dubbo') {
    pipy.listen(port, $ => $
      .fork().to(dumpDubbo)
      .connect(() => `localhost:${originalPort}`)
    )
  }
}
)