(config =>

pipy({
  _root: '',
  _file: null,
})

.import({
  __turnDown: 'main',
  __serviceID: 'router',
})

.pipeline('request')
  .handleMessageStart(
    msg => (
      _root = config.services[__serviceID]?.root,
      _root && (
        _file = http.File.from(_root + (msg.head.path == '/' ? '/index.html' : msg.head.path))
      ),
      _file == null && (
        _file = http.File.from(_root + '/404.html')
      )
    )
  )
  .link(
    'server', () => Boolean(_file),
    'bypass'
  )

.pipeline('server')
  .replaceMessage(
    msg => (
      __turnDown = true,
      _file.toMessage(msg.head.headers['accept-encoding'])
    )
  )

.pipeline('bypass')  

)(JSON.decode(pipy.load('config/static-server.json')))