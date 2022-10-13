((
  config = pipy.solve('config.js'),
) => pipy({
  quotas: Object.fromEntries(
    Object.entries(config.rateLimit).map(
      ([svc, limit]) => [
        svc, limit && limit.rate > 0 ?
          new algo.Quota(limit.rate, { produce: limit.rate, per: limit.window ? limit.window : '1s' })
          :
          null
      ]
    )
  ),
  _quota: undefined,
})
  .import({
    __service: 'main',
  })


  .pipeline()
  .handleStreamStart(
    () => _quota = quotas[__service]
  )
  .branch(
    () => Boolean(_quota), ($ => $
      .throttleMessageRate(
        () => _quota
      )
      .chain()
  ),
    $ => $.chain()
  )
)()