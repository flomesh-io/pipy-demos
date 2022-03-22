(config =>

pipy({
  _logURL: new URL(config.logURL),
  _SERVICE_INFO: {
    name: os.env.SERVICE_NAME || 'anonymous',
  },
  _NODE_INFO: {
    ip: os.env._pod_hostIP || '127.0.0.1',
    name: os.env._pod_nodeName || 'localhost',
  },
  _POD_INFO: {
    ns: os.env._pod_ns || 'default',
    ip: os.env._pod_IP || '127.0.0.1',
    name: os.env._pod_name || os.env.HOSTNAME || 'localhost',
  },
  _CONTENT_TYPES: {
    'text/plain': true,
    'text/html': true,
    'application/json': true,
    'application/xml': true,
    'multipart/form-data': true,
  },
  _request: null,
  _requestTime: 0,
  _responseTime: 0,
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
    '256k',
    msg => _request = msg
  )

.pipeline('log-response')
  .handleMessageStart(
    () => _responseTime = Date.now()
  )
  .decompressHTTP()
  .replaceMessage(
    '256k',
    msg => (
      new Message(
        JSON.encode({
          req: {
            ..._request.head,
            body: _request.body.toString(),
          },
          res: {
            ...msg.head,
            body: msg.body.toString(),
          },
          reqTime: _requestTime,
          resTime: _responseTime,
          reqSize: _request.body.size,
          resSize: msg.body.size,
          endTime: Date.now(),
          remoteAddr: __inbound.remoteAddress && __inbound.remoteAddress.replace('::ffff:', ''),
          remotePort: __inbound.remotePort,
          localAddr: __inbound.localAddress && __inbound.localAddress.replace('::ffff:', ''),
          localPort: __inbound.localPort,
          node: _NODE_INFO,
          pod: _POD_INFO,
          service: _SERVICE_INFO,          
          trace: {
            id: _request.head.headers?.['x-b3-traceid'],
            span: _request.head.headers?.['x-b3-spanid'],
            parent: _request.head.headers?.['x-b3-parentspanid'],
            sampled: _request.head.headers?.['x-b3-sampled']
          },
          ...__logInfo,
        }).push('\n')
      )
    )
  )
  .merge('log-send', '')

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
