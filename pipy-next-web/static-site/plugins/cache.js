(config => 

pipy({
  _cache: {},
  _cachedKey: null,
  _cachedResponse: null,
  _useCache: false,
})

.import({
  __turnDown: 'main',
  __serviceID: 'router',
})

.pipeline('request')
  .handleMessageStart(
    msg => (
      ((
        host, path
      ) => (
        host = msg.head.headers.host,
        path = msg.head.path,
        _useCache = config.services[__serviceID]?.some?.(
          ext => path.endsWith(ext)
        ),

        _useCache && (
          _cachedKey = host + path,
          _cachedResponse = _cache[_cachedKey]
        ),

        _cachedResponse && (
          _cachedResponse.time < Date.now() - config.timeout && (
            _cachedResponse = _cache[_cachedKey] = null
          ),
          __turnDown = true
        )
      ))()
    )
  )
  .link(
    'cache', () => Boolean(_cachedResponse),
    'bypass'
  )

.pipeline('cache')
  .replaceMessage(
    () => _cachedResponse.message
  )

.pipeline('bypass')

.pipeline('response')
  .handleMessage(
    msg => _useCache && (msg.head.status || 200) < 400 && (
      _cache[_cachedKey] = {
        time: Date.now(),
        message: msg,
      }
    )
  )


)(JSON.decode(pipy.load('config/cache.json')))