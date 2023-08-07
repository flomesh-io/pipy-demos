((config, unhealthy_nodes, unhealthy_master) => (
  pipy({
    _servers: new algo.RoundRobinLoadBalancer(config.servers, unhealthy_nodes),
    _masters: new algo.RoundRobinLoadBalancer(config.servers, unhealthy_master),
    _target: '',
    _counter: null,
    _reqTime: 0,
    _commandCounter: new stats.Counter('command', ['command']),
    _requestLatency: new stats.Histogram('request_latency', new Array(16).fill(0).map((_, i) => Math.pow(2, i))),
    _regex: new RegExp('^[$*+:]\\d+\r\n[^\r\n]+\r\n(\\w+)\r\n'),

    _check: resp => (
      (data, role) => (
        unhealthy_nodes.remove(_target),
        data = resp.shift(40).toString().split('\r\n'),
        role = data[2].split(':')[1],
        role === 'master' && unhealthy_master.remove(_target)
      ))()
  })
    .listen(config.port)
    .handleData(
      (data, query, command, master_only) => (
        query = new Data(data).shift(20).toString(),
        (command = _regex.exec(query)?.[1].toLowerCase()) && (
          _commandCounter.withLabels(command).increase(),
          master_only = config.master_only_commands.includes(command),
          _target = master_only ? _masters.select() : _servers.select()
        )
      )
    )
    .link('connection', () => _target)

    .pipeline('connection')
    .handleStreamStart(
      () => (
        _reqTime = Date.now()
      )
    )
    // .handleData(
    //   req => (
    //     //console.log(`Sending request to node ${_target}:\nRequest: ${JSON.encode(req.toString())}`)
    //   )
    // )
    .connect(() => _target,
      {
        connectTimeout: config.connectTimeout,
        readTimeout: config.readTimeout
      }
    )
    .handleData(
      data => (
        _requestLatency.observe(Date.now() - _reqTime)
        // ,
        // console.log(`Response received from node ${_target}:\nResponse: ${JSON.encode(data.toString())}`)
      )
    )

    .task(config.healthcheck.interval)
    .handleStreamStart(
      () => (
        unhealthy_nodes.clear(),
        unhealthy_master.clear(),
        config.servers.forEach(t => (
          unhealthy_nodes.set(t, true),
          unhealthy_master.set(t, true)
        )),
        _counter = { n: 0 }
      )
    )
    .fork('per-node',
      () => (config.servers.map(t => ({ _target: t }))))
    .replaceMessage(
      new StreamEnd
    )
    .wait(
      () => _counter.n === 0
    )

    .pipeline('per-node')
    .replaceMessage(
      () => (
        _counter.n++,
        new Message("info replication\r\n")
      )
    )
    .connect(
      () => _target,
      {
        connectTimeout: config.healthcheck.connectTimeout,
        readTimeout: config.healthcheck.readTimeout
      }
    )
    .handleData(
      data => _check(data)
    )
    .handleStreamEnd(
      () => _counter.n--
    )
))(JSON.decode(pipy.load('config/config.json')), new algo.Cache(), new algo.Cache())