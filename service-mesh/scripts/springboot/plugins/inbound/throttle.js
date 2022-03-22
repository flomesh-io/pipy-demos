(config =>

pipy({
  _services: config.services,
  _rateLimit: undefined,
})

.import({
  __localServiceID: 'main',
})

.pipeline('request')
  .handleStreamStart(
    () => _services[__localServiceID] && (
        _rateLimit = _services[__localServiceID]?.rateLimit
      )
  )
  .link(
    'throttle', () => Boolean(_rateLimit),
    'bypass'
  )

.pipeline('throttle')
  .throttleMessageRate(
    () => _rateLimit,
    ''
  )

.pipeline('bypass')

)(JSON.decode(pipy.load('config/inbound/throttle.json')))
