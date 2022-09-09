((
  config = JSON.decode(pipy.load('config/balancer.json')),
  services = Object.fromEntries(
    Object.entries(config.services).map(
      ([k, v]) => [
        k, new algo.RoundRobinLoadBalancer(v)
      ]
    )
  ),
) => pipy({
  _target: undefined,
})

  .import({
    __service: 'main',
  })

  .pipeline()
  .branch(
    () => Boolean(_target = services[__service]?.next?.()),
    $ => $.muxHTTP(() => _target).to(
      $ => $.connect(() => _target.id)
    ),
    $ => $.chain()
  )
)()