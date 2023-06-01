((
  { config } = pipy.solve('config.js'),
  { loadBalancers } = pipy.solve('tunnel-init.js'),
) => (pipy()

.repeat(
  Object.entries(config.loadBalancers),
  ($, [addr, v])=>$
  .listen(addr, { protocol: 'tcp', ...v })
  .onStart(new Data)
  .use('tunnel-main.js', 'startup'),
)
.branch(
  (Object.keys(config.loadBalancers || {}).forEach(
    e => (
      (e.startsWith(':::')) && (
        (port = e.replace(':::', '')) => (
          loadBalancers[port] = loadBalancers[e],
          config.loadBalancers[port] = config.loadBalancers[e]
        )
      )(),
      (e.startsWith('0.0.0.0:')) && (
        (port = e.replace('0.0.0.0:', '')) => (
          loadBalancers[port] = loadBalancers[e],
          config.loadBalancers[port] = config.loadBalancers[e]
        )
      )(),
      (e.indexOf(']') > 0) && (
        (ipv6 = e.replace('[', '').replace(']', '')) => (
          loadBalancers[ipv6] = loadBalancers[e],
          config.loadBalancers[ipv6] = config.loadBalancers[e]
        )
      )()
    )
  ), __thread.id === 0),
  $=>$.listen(config.healthcheck.port).use('tunnel-main.js', 'healthcheck')
)

))()