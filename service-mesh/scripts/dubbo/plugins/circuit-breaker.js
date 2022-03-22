(config => (

pipy({
  _configs: config.serviceIDs,
  _config: null,
  _requestCounter: new stats.Counter('dubbo_circuit_break_count', ['service', 'version'])
})

.import({
  __turnDown: 'main',
  __serviceID: 'router',
  __service: 'router',
})

.pipeline('request')
  .replaceMessage(
    (msg) => (
      _config = _configs[__serviceID],
      _config?.enabled ? (
        __turnDown = true,
        //circuit breaker metrics
        _requestCounter.withLabels(__serviceID, __service.version).increase(),
        _config?.response ? 
          new Message({
              ...msg.head,
              isRequest: false,
              isTwoWay: false,
              isEvent: false,
              status: _config.response.status
              }, Hessian.encode([_config.response.code,_config.response.content,{"dubbo":"2.0.2"}]))
        : new Message({
              ...msg.head,
              isRequest: false,
              isTwoWay: false,
              isEvent: false,
              status: config.response.status
              }, Hessian.encode([config.response.code,config.response.content,{"dubbo":"2.0.2"}]))
      ) : msg
    )
  )

))(JSON.decode(pipy.load('config/circuit-breaker.json')))