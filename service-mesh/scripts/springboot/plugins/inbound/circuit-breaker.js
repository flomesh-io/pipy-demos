(config =>
  
pipy({
  _service: null,
})

.import({
  __localServiceID: 'main',
  __turnDown: 'main',
})

.pipeline('session')
  .handleStreamStart(
    () => _service = config.services[__localServiceID]
  )

.pipeline('request')
  .link(
    'circuit-break', () => _service?.enabled,
    ''
  )

.pipeline('circuit-break')
  .replaceMessage(
    msg => (
      __turnDown = true,
      _service?.response?.head ? (
        new Message(_service.response.head, _service.response.message)
      ) : new Message(config.response.head, config.response.message)
    )
  )

)(JSON.decode(pipy.load('config/inbound/circuit-breaker.json')))