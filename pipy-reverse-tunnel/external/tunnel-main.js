((
  { config } = pipy.solve('config.js'),

  {
    isDebugEnabled,
    slotCount,
    slotArray,
    listIssuingCA,
    tunnelServers,
    fullTargetStructs,
    serverTargetStructs,
    unhealthyTargetCache,
    unhealthyTargetTTLCache,
    loadBalancers,
  } = pipy.solve('tunnel-init.js'),

  probeIndex = 0,
  pingFailures = {},
  accessFailures = {},
  unhealthyServers = new Set(),
  unhealthyTargets = new Set(),

  pipyTunnelHealthyGauge = new stats.Gauge('pipy_tunnel_healthy', ['tunnelName']),
  pipyTunnelTargetHealthyGauge = new stats.Gauge('pipy_tunnel_target_healthy', ['tunnelName', 'target']),
  pipyActiveConnectionGauge = new stats.Gauge('pipy_active_connection', ['serviceId', 'tunnelName', 'target']),
  pipyTotalConnectionCounter = new stats.Counter('pipy_total_connection', ['serviceId', 'tunnelName', 'target']),
  pipyTunnelActiveConnectionGauge = new stats.Gauge('pipy_tunnel_active_connection', ['serviceId', 'tunnelName', 'target']),
  pipyTunnelTotalConnectionCounter = new stats.Counter('pipy_tunnel_total_connection', ['serviceId', 'tunnelName', 'target']),
  pipySendTargetBytesTotalCounter = new stats.Counter('pipy_send_target_bytes_total', ['serviceId', 'tunnelName', 'target']),
  pipyReceiveTargetBytesTotalCounter = new stats.Counter('pipy_receive_target_bytes_total', ['serviceId', 'tunnelName', 'target']),
  pipySendTunnelBytesTotalCounter = new stats.Counter('pipy_send_tunnel_bytes_total', ['serviceId', 'tunnelName', 'target']),
  pipyReceiveTunnelBytesTotalCounter = new stats.Counter('pipy_receive_tunnel_bytes_total', ['serviceId', 'tunnelName', 'target']),

  logger = config?.healthcheckLog?.reduce?.(
    (logger, target) => (
      logger.toHTTP(
        target.url, {
          headers: target.headers,
          batch: target.batch
        }
      )
    ),
    new logging.JSONLogger('healthcheck')
  ),

  log = (upstream, target, status) => (
    logger?.log?.({
      upstream: upstream,
      target: target,
      state: (status === 1) ? 'healthy' : 'unhealthy',
      timestamp: Date.now(),
    })
  ),

  accessLog = config?.accessLog?.reduce?.(
    (logger, target) => (
      logger.toHTTP(
        target.url, {
          headers: target.headers,
          batch: target.batch
        }
      )
    ),
    new logging.JSONLogger('access')
  ),

  setTunnelHealthy = (target, status) => (
    pipyTunnelHealthyGauge.withLabels(tunnelServers[target]?.name).set(status),
    log(tunnelServers[target]?.name, '', status)
  ),

  setTargetHealthy = (key, status) => (
    key && (
      (items = key.split('@')) => (
        pipyTunnelTargetHealthyGauge.withLabels(tunnelServers[items[1]]?.name, items[0]).set(status),
        log(tunnelServers[items[1]]?.name, items[0], status)
      )
    )()
  ),

  iplistJson = JSON.decode(pipy.load('ip-list.json')),

  parseIpList = ipList => (
    (ips, ipRanges) => (
      (ipList || []).forEach(
        o => (
          o.indexOf('/') > 0 ? (
            !ipRanges && (ipRanges = []),
            ipRanges.push(new Netmask(o))
          ) : (
            !ips && (ips = {}),
            ips[o] = true
          )
        )
      ),
      (ips || ipRanges) && { ips, ipRanges }
    )
  )(),

  parseServiceIpList = ipList => (
    (
      result = Object.fromEntries(Object.entries(ipList || {}).map(([k, v]) => [k, parseIpList(v)]))
    ) => (
      Object.keys(result).length > 0 ? result : undefined
    )
  )(),

  blackList = {
    global: parseIpList(iplistJson?.blacklist?.ips),
    service: parseServiceIpList(iplistJson?.blacklist?.serviceName)
  },

  whiteList = {
    global: parseIpList(iplistJson?.whitelist?.ips),
    service: parseServiceIpList(iplistJson?.whitelist?.serviceName)
  },

  blackWhiteList = {
    blackList,
    whiteList
  },

  checkIpList = (serviceName, ip) => (
    (
      white = blackWhiteList?.whiteList,
      black = blackWhiteList?.blackList,
      blackMode = true,
      block = false,
      pass = false,
    ) => (
      white?.global && (
        blackMode = false,
        (white.global.ips?.[ip] && (pass = true)) || (
          pass = white.global.ipRanges?.find?.(r => r.contains(ip))
        )
      ),
      !pass && white?.service?.[serviceName] && (
        blackMode = false,
        (white.service[serviceName].ips?.[ip] && (pass = true)) || (
          pass = white.service[serviceName].ipRanges?.find?.(r => r.contains(ip))
        )
      ),
      blackMode && (
        black?.global && (
          (black.global.ips?.[ip] && (block = true)) || (
            block = black.global.ipRanges?.find?.(r => r.contains(ip))
          )
        ),
        !block && black?.service?.[serviceName] && (
          (black.service[serviceName].ips?.[ip] && (block = true)) || (
            block = black.service[serviceName].ipRanges?.find?.(r => r.contains(ip))
          )
        )
      ),
      blackMode ? Boolean(!block) : Boolean(pass)
    )
  )(),

  swapStructs = {},

  listIssuingCA = [],

  tlsConfig = (
    (tls = {}) => (
      Object.entries(config?.tunnel?.servers || {}).map(
        ([k, v]) => (
          tls[k] = {
            cert: v.tlsCert && new crypto.Certificate(pipy.load(v.tlsCert)),
            key: v.tlsKey && new crypto.PrivateKey(pipy.load(v.tlsKey)),
            ca: v.tlsCA && new crypto.Certificate(pipy.load(v.tlsCA)),
          },
          (!tls[k].cert || !tls[k].key) && (
            console.log(`[*warning*] server: ${k} missing tls config.`),
            delete tls[k]
          ),
          tls[k]?.ca && listIssuingCA.push(tls[k].ca)
        )
      ),
      tls
    )
  )(),

) => pipy({
  _reqSize: 0,
  _resSize: 0,
  _reqRawSize: 0,
  _resRawSize: 0,
  _path: undefined,
  _target: undefined,
  _backend: undefined,
  _tunnel: undefined,
  _balancer: undefined,
  _serviceId: undefined,
  _loadBalancerAddr: undefined,
  _skipTask: true,
  _probeResult: undefined,
  _bpsLimit: -1,
  _isBlocked: false,
  _serverPromises: null,
  _targetPromises: null,
  _resolve: null,
  _accessLogStruct: null,
})

.branch(
  Boolean(config?.tunnel?.reverseMode), ($=>$
    .repeat(
      Object.entries(config?.tunnel?.servers || {}),
      ($, [addr, v])=>$
      .listen(addr, { protocol: 'tcp', readTimeout: 60, idleTimeout: 60, ...v })
      .onStart(new Data)
      .branch(
        () => tlsConfig[addr], ($=>$
          .acceptTLS({
            certificate: () => ({
              cert: tlsConfig[addr].cert,
              key: tlsConfig[addr].key
            }),
            trusted: listIssuingCA
          }).to($=>$
            .link(() => swapStructs[addr] = new Swap)
            .handleStreamEnd(
              () => (
                swapStructs[addr] = null
              )
            )
          )
        ), (
          $=>$
          .link(() => swapStructs[addr] = new Swap)
          .handleStreamEnd(
            () => (
              swapStructs[addr] = null
            )
          )
        )
      )
      .listen(v.shadowPort, { protocol: 'tcp', readTimeout: 60, idleTimeout: 60, ...v })
      .onStart(new Data)
      .branch(
        () => swapStructs[addr], (
          $=>$.link(() => swapStructs[addr])
        ), (
          $=>$
          .replaceStreamStart(
            () => new StreamEnd
          )
        )
      )
    )
  )
)

.pipeline('shadow')
.onStart(new Data)
.muxHTTP(() => _tunnel, { version: 2 }).to($=>$
  .branch(
    () => _backend, (
      $=>$.link('upstream')
    ), (
      $=>$.connect(() => '127.0.0.1:' + _tunnel?.shadowPort,
        {
          connectTimeout: config?.tunnel?.healthcheck.connectTimeout,
          readTimeout: config?.tunnel?.healthcheck.readTimeout
        }
      )
    )
  )
)

.watch('ip-list.json')
.onStart(() => (
  (
    update = JSON.decode(pipy.load('ip-list.json')),
    blackList = {
      global: parseIpList(update?.blacklist?.ips),
      service: parseServiceIpList(update?.blacklist?.serviceName)
    },
    whiteList = {
      global: parseIpList(update?.whitelist?.ips),
      service: parseServiceIpList(update?.whitelist?.serviceName)
    },
  ) => (
    blackWhiteList = {
      blackList,
      whiteList
    },
    new StreamEnd
  )
)())

.pipeline('startup')
.handleStreamStart(
  () => (
    accessLog && (
      _accessLogStruct = {trace: {id: algo.uuid()}},
      _accessLogStruct.localAddr = __inbound.localAddress,
      _accessLogStruct.localPort = __inbound.localPort,
      _accessLogStruct.remoteAddr = __inbound.remoteAddress,
      _accessLogStruct.remotePort = __inbound.remotePort,
      _accessLogStruct.reqTime = Date.now()
    ),
    _loadBalancerAddr = `${__inbound.localAddress}:${__inbound.localPort}`,
    (_serviceId = config.loadBalancers[_loadBalancerAddr]?.serviceId) || (
      _loadBalancerAddr = __inbound.localPort,
      _serviceId = config.loadBalancers[_loadBalancerAddr]?.serviceId
    ),
    _serviceId && (
      _bpsLimit = config.loadBalancers[_loadBalancerAddr]?.bpsLimit,
      _balancer = loadBalancers[_loadBalancerAddr],
      _target = _balancer?.borrow?.(__inbound, (config.loadBalancers[_loadBalancerAddr]?.sticky ? __inbound.remoteAddress : null), unhealthyTargetTTLCache),
      _target?.id && (_backend = fullTargetStructs[_target.id]) && (
        _tunnel = _backend.server,
        _isBlocked = !checkIpList(_backend.load.serviceName, __inbound.remoteAddress),
        pipyActiveConnectionGauge.withLabels(_serviceId, _backend.server.name, _backend.path).increase(),
        pipyTotalConnectionCounter.withLabels(_serviceId, _backend.server.name, _backend.path).increase(),
        accessLog && (
          _accessLogStruct.tunnel = {
            serviceName: config.loadBalancers[_loadBalancerAddr]?.serviceName,
            tunnelName: _backend.server.name,
            target: _backend.path,
            blocked: _isBlocked,
          }
        )
      )
    ),
    accessLog && accessLog.log(_accessLogStruct)
  )
)
.branch(
  () => _bpsLimit > 0, (
    $=>$.throttleDataRate(
      () => (
        new algo.Quota(
          _bpsLimit,
          {
            produce: _bpsLimit,
            per: '1s',
          }
        )
      )
    )
  ), (
    $=>$
  )
)
.branch(
  isDebugEnabled, (
    $=>$.handleStreamStart(
      () => (
        console.log(`[*New tunnel*]' __thread.id: ${__thread.id}, LB: ${_loadBalancerAddr}, server: ${_tunnel?.target}, target: ${_backend?.path}, blocked: ${_isBlocked}, clientIp: ${__inbound.remoteAddress}`)
      )
    )
  )
)
.branch(
  () => _isBlocked || !Boolean(_backend), (
    $=>$.replaceStreamStart(
      () => new StreamEnd('ConnectionReset')
    )
  ), (
    $=>$.link('pass')
  )
)
.branch(
  () => _bpsLimit > 0, (
    $=>$.throttleDataRate(
      () => (
        new algo.Quota(
          _bpsLimit,
          {
            produce: _bpsLimit,
            per: '1s',
          }
        )
      )
    )
  ), (
    $=>$
  )
)
.handleStreamEnd(
  () => _backend && (
    pipyActiveConnectionGauge.withLabels(_serviceId, _backend.server.name, _backend.path).decrease()
  )
)

.pipeline('pass')
.handleData(
  data => (
    _reqRawSize += data.size,
    pipySendTargetBytesTotalCounter.withLabels(_serviceId, _backend.server.name, _backend.path).increase(data.size)
  )
)
.connectHTTPTunnel(
  () => new Message({
    method: 'CONNECT',
    path: _backend.path,
  })
).to($=>$
  .branch(
    () => _tunnel?.shadowPort, (
      $=>$.link('shadow')
    ), (
      $=>$.muxHTTP(() => _backend, { version: 2 }).to(
        $=>$.branch(
          () => _backend.server.tlsCert, (
            $=>$.connectTLS({
              certificate: () => ({
                cert: _backend.server.tlsCert,
                key: _backend.server.tlsKey,
              }),
              trusted: listIssuingCA,
            }).to($=>$.link('upstream'))
          ), (
            $=>$.link('upstream')
          )
        )
      )
    )
  )
)
.handleData(
  data => (
    _resRawSize += data.size,
    pipyReceiveTargetBytesTotalCounter.withLabels(_serviceId, _backend.server.name, _backend.path).increase(data.size)
  )
)
.handleStreamEnd(
  (e) => (
    accessLog && (
      _accessLogStruct.reqSize = _reqRawSize,
      _accessLogStruct.resSize = _resRawSize,
      _accessLogStruct.endTime = Date.now(),
      accessLog.log(_accessLogStruct)
    ),
    (_reqRawSize > 0 && _resRawSize === 0) ? (
      accessFailures[_backend.key] = (accessFailures[_backend.key] | 0) + 1,
      isDebugEnabled && (
        console.log(`[*StreamEnd*] error: ${e.error}, target: ${_backend.key}, times: ${accessFailures[_backend.key]}`)
      ),
      (accessFailures[_backend.key] >= config.tunnel.healthcheck.target.failures) && (
        accessFailures[_backend.key] = config.tunnel.healthcheck.target.failures,
        unhealthyTargetTTLCache.set(_backend.key, true),
        setTargetHealthy(_backend.key, 0)
      )
    ) : delete accessFailures[_backend.key]
  )
)

.pipeline('upstream')
.handleStreamStart(
  () => (
    pipyTunnelActiveConnectionGauge.withLabels(_serviceId, _backend.server.name, _backend.path).increase(),
    pipyTunnelTotalConnectionCounter.withLabels(_serviceId, _backend.server.name, _backend.path).increase()
  )
)
.handleData(
  data => (
    _reqSize += data.size,
    pipySendTunnelBytesTotalCounter.withLabels(_serviceId, _backend.server.name, _backend.path).increase(data.size)
  )
)
.branch(
  () => _tunnel?.shadowPort, (
    $=>$.connect(() => '127.0.0.1:' + _tunnel?.shadowPort, { connectTimeout: 1, retryCount: 0 })
  ), (
    $=>$.connect(() => _backend.server.target, { connectTimeout: 3, retryCount: config.tunnel.policies.connectRetry })
  )
)
.handleData(
  data => (
    _resSize += data.size,
    pipyReceiveTunnelBytesTotalCounter.withLabels(_serviceId, _backend.server.name, _backend.path).increase(data.size)
  )
)
.handleStreamEnd(
  (e) => (
    (e.error === 'ConnectionRefused' || e.error === 'ConnectionTimeout') ? (
      (target = _backend.server.target) => (
        accessFailures[target] = (accessFailures[target] | 0) + 1,
        isDebugEnabled && (
          console.log(`[*StreamEnd*] error: ${e.error}, server: ${target}, times: ${accessFailures[target]}`)
        ),
        (accessFailures[target] >= config.tunnel.healthcheck.server.failures) && (
          accessFailures[target] = config.tunnel.healthcheck.server.failures,
          serverTargetStructs[target]?.forEach(
            t => (
              unhealthyTargetTTLCache.set(t, true),
              setTargetHealthy(t, 0)
            )
          )
        )
      )
    )() : delete accessFailures[_backend.server.target],
    pipyTunnelActiveConnectionGauge.withLabels(_serviceId, _backend.server.name, _backend.path).decrease()
  )
)

.pipeline('ping')
.replaceMessage(
  msg => (
    _probeResult = -1,
    _path = msg?.head?.path,
    _target = msg?.head?.target,
    _target ? (
      _tunnel = tunnelServers[_target],
      new Message({
        method: 'GET',
        path: _path,
        headers: { 'x-pipy-probe': 'PING' }
      })
    ) : new Message
  )
)
.branch(
  () => _tunnel?.shadowPort, (
    $=>$
    .link('shadow')
    .link('pong')
  ),
  () => Boolean(_target), (
    $=>$.muxHTTP(() => _target, { version: 2 }).to(
      $=>$
      .branch(
        () => _tunnel?.tlsCert, (
          $=>$.connectTLS({
            certificate: () => ({
              cert: _tunnel.tlsCert,
              key: _tunnel.tlsKey,
            }),
            trusted: listIssuingCA,
          }).to(
            $=>$.connect(() => _target,
              {
                connectTimeout: config?.tunnel?.healthcheck.connectTimeout,
                readTimeout: config?.tunnel?.healthcheck.readTimeout
              }
            )
          )
        ), (
          $=>$.connect(() => _target,
            {
              connectTimeout: config?.tunnel?.healthcheck.connectTimeout,
              readTimeout: config?.tunnel?.healthcheck.readTimeout
            }
          )
        )
      )
    )
    .link('pong')
  ), (
    $=>$
  )
)

.pipeline('pong')
.handleMessage(
  msg => (
    msg?.head?.headers?.['x-pipy-probe'] === 'PONG' && (_probeResult = 1),
    msg?.head?.headers?.['x-pipy-probe'] === 'FAIL' && (_probeResult = 0),
    (
      (key = _path + '@' + _target) => (
        (_probeResult === 1) ? (
          isDebugEnabled && (
            console.log(`[*ping OK*] server: ${_target}, target: ${_path}`)
          ),
          delete pingFailures[key],
          _path === '/' ? (
            unhealthyServers.delete(_target),
            setTunnelHealthy(_target, 1)
          ) : (
            unhealthyTargets.delete(key),
            setTargetHealthy(key, 1)
          )
        ) : (
          pingFailures[key] = (pingFailures[key] | 0) + 1,
          isDebugEnabled && (
            console.log(`[*ping FAIL*] server: ${_target}, target: ${_path}, times: ${pingFailures[key]}`)
          ),
          (_path === '/') ? (
            (pingFailures[key] >= config.tunnel.healthcheck.server.failures) && (
              pingFailures[key] = config.tunnel.healthcheck.server.failures,
              unhealthyServers.add(_target),
              setTunnelHealthy(_target, 0),
              serverTargetStructs[_target]?.forEach?.(
                t => (
                  unhealthyTargets.add(t),
                  setTargetHealthy(t, 0)
                )
              )
            )
          ) : (
            (pingFailures[key] >= config.tunnel.healthcheck.target.failures) && (
              pingFailures[key] = config.tunnel.healthcheck.target.failures,
              unhealthyTargets.add(key),
              setTargetHealthy(key, 0)
            )
          )
        )
      )
    )()
  )
)

.pipeline('healthcheck')
.serveHTTP(
  () => (
    (data = []) => (
      unhealthyTargets.forEach(e => data.push(e)),
      new Message(
        {
          headers: {
            'content-type': 'application/json'
          },
        },
        JSON.encode({ unhealthy: data })
      )
    )
  )()
)

.task(config.healthcheck.interval)
.onStart(
  () => new Message({
    method: 'GET',
    path: '/unhealthy',
    headers: {
      'Host': config.healthcheck.host,
      'Content-Type': 'application/json',
    }
  })
)
.muxHTTP().to(
  $=>$.connect(
    () => `${config.healthcheck.host}:${config.healthcheck.port}`,
    { bufferLimit: '1m' }
  )
)
.replaceMessage(
  msg => (
    (obj = JSON.decode(msg?.body)) => (
      obj?.unhealthy && (
        unhealthyTargetCache.clear(),
        obj?.unhealthy.forEach(
          e => (
            unhealthyTargetCache.set(e, true),
            isDebugEnabled && (__thread.id === 0) && (
              console.log(`[*Unhealthy cache*] __thread.id: ${__thread.id}, unhealthy: ${e}`)
            )
          )
        )
      ),
      new StreamEnd
    )
  )()
)

.task(config?.tunnel?.healthcheck?.server?.interval)
.onStart(
  () => (
    _serverPromises = [],
    (_skipTask = (__thread.id !== 0)) ? (
      new StreamEnd
    ) : (
      (jobs = null, promise, resolve) => (
        jobs = Object.keys(tunnelServers).filter(
          e => tunnelServers[e].weight > 0
        ).map(
          e => (
            promise = new Promise(
              r => resolve = r
            ),
            _serverPromises.push(promise),
            new Message({ path: '/', target: e, resolve })
          )
        ),
        isDebugEnabled && (jobs.length > 0) && (
          console.log(`[*Timer*] ping server count : ${jobs.length}`)
        ),
        jobs.length > 0 ? jobs : new StreamEnd
      )
    )()
  )
)
.branch(
  () => !_skipTask, (
    $=>$
    .demux().to(
      $=>$
      .handleMessage(
        msg => (
          (_resolve = msg?.head?.resolve) && (
            delete msg.head.resolve
          )
        )
      )
      .link('ping')
      .replaceStreamEnd(
        () => (
          _resolve?.(),
          new Message
        )
      )
    )
  ), (
    $=>$
  )
)
.wait(
  () => Promise.all(_serverPromises)
)
.replaceMessage(
  () => new StreamEnd
)

.task('1s')
.onStart(
  () => (
    _targetPromises = [],
    (_skipTask = (__thread.id !== 0)) ? (
      new StreamEnd
    ) : (
      (jobs = null, exist = {}, promise, resolve) => (
        probeIndex >= slotCount && (probeIndex = 0),
        jobs = (slotArray[probeIndex] || []).filter(
          e => (!exist[e.key] && !unhealthyServers.has(e.server.target)) ? (exist[e.key] = true) : false
        ).map(
          e => (
            promise = new Promise(
              r => resolve = r
            ),
            _targetPromises.push(promise),
            new Message({ path: e.path, target: e.server.target, resolve})
          )
        ),
        probeIndex++,
        isDebugEnabled && (jobs.length > 0) && (
          console.log(`[*Timer*] ping target count : ${jobs.length}`)
        ),
        jobs.length > 0 ? jobs : new StreamEnd
      )
    )()
  )
)
.branch(
  () => !_skipTask, (
    $=>$
    .demux().to(
      $=>$
      .handleMessage(
        msg => (
          (_resolve = msg?.head?.resolve) && (
            delete msg.head.resolve
          )
        )
      )
      .link('ping')
      .replaceStreamEnd(
        () => (
          _resolve?.(),
          new Message
        )
      )
    )
  ), (
    $=>$
  )
)
.wait(
  () => Promise.all(_targetPromises)
)
.replaceMessage(
  () => new StreamEnd
)

)()