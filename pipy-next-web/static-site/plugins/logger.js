(config =>

pipy({
  _logURL: new URL(config.logURL),
  _request: null,
  _requestTime: 0,
  _responseTime: 0,
  _responseContentType: '',
  _instanceName: os.env.PIPY_SERVICE_NAME,


  _CONTENT_TYPES: {
    '': true,
    'text/plain': true,
    'application/json': true,
    'application/xml': true,
    'multipart/form-data': true,
  },

})

  .export('logger', {
    __logInfo: {},
  })

  .pipeline('request')
  .fork('log-request')

  .pipeline('response')
  .fork('log-response')

  .pipeline('log-request')
  .handleMessageStart(
    () => _requestTime = Date.now()
  )
  .decompressHTTP()
  .handleMessage(
    '1024k',
    msg => (
      _request = msg
    )
  )

  .pipeline('log-response')
  .handleMessageStart(
    msg => (
      _responseTime = Date.now(),
      _responseContentType = (msg.head.headers && msg.head.headers['content-type']) || ''
    )
  )
  .replaceData()
  .replaceMessage(
    '1024k',
    msg => (
      msg.head && (msg.head.status = msg.head.status || 200),
      new Message(
        JSON.encode({
          req: {
            ..._request.head,
          },
          res: {
            ...msg.head,
          },
          instanceName: _instanceName,
          reqTime: _requestTime,
          resTime: _responseTime,
          endTime: Date.now(),
          reqSize: _request.body.size,
          resSize: msg.body.size,
          remoteAddr: __inbound?.remoteAddress,
          remotePort: __inbound?.remotePort,
          localAddr: __inbound?.localAddress,
          localPort: __inbound?.localPort,
          ...__logInfo,
        }).push('\n')
      )
    ),
  )
  .merge('log-send', "")

  .pipeline('log-send')
  .pack(
    1000,
    {
      timeout: 5,
    }
  )
  .replaceMessageStart(
    () => new MessageStart({
      method: 'POST',
      path: _logURL.path,
      headers: {
        'Host': _logURL.host,
        'Content-Type': 'application/json',
      }
    })
  )
  .encodeHTTPRequest()

  .connect(
    () => _logURL.host,
    {
      bufferLimit: '8m',
    }
  )

)(JSON.decode(pipy.load('config/logger.json')))
