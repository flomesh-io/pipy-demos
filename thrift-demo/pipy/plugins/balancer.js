((
  config = pipy.solve('config.js'),
  services = Object.fromEntries(
    Object.entries(config.services).map(([k, v]) => (
      [
        k, new algo.RoundRobinLoadBalancer(v)
      ]
    ))
  ),
) => pipy({
  _target: undefined,
  _borrower: undefined,
})

  .import({
    __service: 'main',
  })
  .pipeline()
  .onStart(() => (
    _borrower = {},
    null
  ))
  .handleMessageStart(
    () => (
      _target = services[__service]?.next?.(_borrower),
      console.log(_target.id)
    )
  )
  .branch(
    () => Boolean(_target), (
    $ => $
      .encodeThrift()
      .muxQueue(() => _target).to($ => $
        .connect(() => _target.id)
        .decodeThrift({ payload: true })
      )
  ),
    $ => $.chain()
  )
)()