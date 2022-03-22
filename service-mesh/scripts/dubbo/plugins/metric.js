pipy({
  _requestCouner: new stats.Counter('dubbo_request_count', ['service', 'version', 'status']),
  _requestLatency: new stats.Histogram(
    'dubbo_request_latency',
    [5,10,20,50,100],
    ['service', 'version']
  ),
  _requestTime: 0,
})

.import({
  __service: 'router',
  __serviceID: 'router',
})

.pipeline('request')
  .handleMessageStart(
    () => _requestTime = Date.now()
  )

.pipeline('response')
  .handleMessageStart(
    msg => __service && (
      _requestCouner.withLabels(__serviceID, __service.version, msg.head.status).increase(),
      _requestLatency.withLabels(__serviceID, __service.version).observe(Date.now() - _requestTime)
    )
  )