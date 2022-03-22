(config =>

pipy()

.import({
  __balancers: 'balancer',
})

.task()
  .handleMessageStart(
    () => Object.entries(config.services).forEach(
      ([k,v]) => __balancers[k] = new algo.RoundRobinLoadBalancer(v)
    )
  )
  .replaceMessage(new StreamEnd)

.pipeline('init')  
)(JSON.decode(pipy.load('config/registry.json')))