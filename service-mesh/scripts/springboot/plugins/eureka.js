//taking router and balancer roles
pipy({
  _servicePortOffset: +(os.env.PIPY_LISTEN_HTTP_INBOUND_OFFSET || 10),
  _serviceVersion: os.env.SERVICE_VERSION,
  _localMappingFile: os.env.LOCAL_MAPPING_FILE || '/opt/data/mapping',
  _mapping: JSON.decode(os.readFile(os.env.LOCAL_MAPPING_FILE || '/opt/data/mapping')) || {},
  _range: new Netmask('127.0.0.0/8'),
  _generteLoopback: (ip) => (
    ip = _range.next(),
    Object.entries(_mapping).some(([k,v]) => ip == v) ? _generteLoopback() : ip
  ),
  _g: {
    connectionID: 0,
    deltaVersion: ''
  },
  _request: null
})

.import({
  __turnDown: 'main',
  __localServiceID: 'main',
  __services: 'router',
  __balancers: 'balancer',
})

.task()
  .replaceMessage(
    new Message(
      {
        method: 'GET',
        path: '/eureka/apps',
        headers: {
          "host": "localhost:8771",
          "user-agent": "curl/7.64.1",
          "accept": "application/json",
          'accept-encoding': 'gzip',
        },
      },
      '',
    )
  )
  .link('forward')
  .replaceMessage(
    () => (
      console.log('full fetch done'),
      new StreamEnd
    )
  )
  .replaceMessage(new StreamEnd)


.pipeline('connection')
  .connect(os.env.DISCOVERY_SERVICE || '127.0.0.1:8761')

.pipeline('forward')
  .handleMessage(
    msg => _request = msg
  )
  .replaceMessage( // inject metadata to register message: serviceName, tag. Both of them are from pod annotation
    msg => (
      (data) => (
        msg.head.method == 'POST' ? (
          data = JSON.decode(msg.body),
          data?.instance && data.instance?.metadata ? (
            data.instance.metadata['service'] = __localServiceID,
            data.instance.metadata['tag'] = _serviceVersion,
            new Message(msg.head, JSON.encode(data))
          ) : msg
        ) : msg
      )
    )()
  )
  .link('')
  .muxHTTP('connection', '')
  .decompressHTTP()
  .replaceMessage(
    msg => (
      (
        body, //res
        reqHead, // request head
        data,
        name,
        targets,
        loopback,
        balancerSubset,
      ) => (
        reqHead = _request?.head,
        msg.head.headers['content-encoding'] = '*', // indicate downsream decompression unnecessary
        // full fetch and delta fetch
        (reqHead?.path == '/eureka/apps/' || reqHead?.path == '/eureka/apps' || reqHead?.path.startsWith('/eureka/apps/?') || reqHead?.path == '/eureka/apps/delta') && reqHead?.headers?.accept?.startsWith('application/json') && reqHead?.method == 'GET' ? (
          body = msg.body,
          data = JSON.decode(body),
          data?.applications?.application?.forEach(
            //application
            a => (
              targets = null,
              loopback = null,
              balancerSubset = {},
              name = a.instance?.find?.( // extract name for metadata.service, use application name if metadata.service not exist
                ins => Boolean(ins.metadata?.service)
              )?.metadata?.service || a.name.toLowerCase(),
              loopback = _mapping[name],
              loopback || (
                loopback = _generteLoopback(),
                _mapping[name] = loopback
              ),
              // console.log(`processing service: ${name}`),
              //excluding instaince with sidecar injected but diffect version
              //those instances are not in same version scope
              // commented 
              // a.instance = a.instance?.filter(
              //   i => i.metadata?.version == undefined || i.metadata?.version == _serviceVersion || i.metadata?.version == 'main'
              // ),

              targets = a.instance?.map?.(
                ins => ((addr, tag, weight, deleted) => (
                  // console.log(`processing instance ${i.instanceId}`),
                  //port offset for sidecar inject intance only
                  addr = ins.metadata?.mesh == 'true' ? `${ins.ipAddr}:${+ins.port.$ + _servicePortOffset}` : `${ins.ipAddr}:${ins.port.$}`,
                  tag = ins.metadata?.tag,
                  weight = ins.metadata?.weight || 100,
                  //mark instance action
                  deleted = ins.actionType == 'DELETED',
                  { addr, tag, weight, deleted }
                ))('', '', '')
              ),
              _g.deltaVersion < data.applications['versions__delta'] && (
                //update service targets
                ((deleted, added) => (
                  deleted = targets.filter(t => t.deleted),
                  added = targets.filter(t => !t.deleted),
                  //init if not exist
                  __services[loopback] || (__services[loopback] = { "name": name, "targets": [] }),
                  //remove DELETE instances
                  __services[loopback].targets = __services[loopback]?.targets.filter(
                    t => !deleted.find(d => d.addr == t.addr)
                  ),
                  //add ADDED instances
                  added.forEach(
                    a => (
                      !__services[loopback].targets.find(exist => exist.addr == a.addr) && (
                        // delete a.deleted, //remove delete field
                        __services[loopback]?.targets.push(a)
                      )
                    )
                  )
                ))([], []),
                //update service balancer subset
                __services[loopback]?.targets.length > 0 && __services[loopback].targets.forEach(
                  target => (
                    b => (
                      // Boolean(b = balancerSubset[name]) || (b = balancerSubset[name] = new algo.RoundRobinLoadBalancer()),
                      Boolean(b = balancerSubset[name]) || (b = balancerSubset[name] = {}),
                      // b.set(target.addr, target.weight),
                      b[target.addr] = target.weight,
                      target.tag && (
                        // Boolean(b = balancerSubset[`${name}-${target.tag}`]) || (b = balancerSubset[`${name}-${target.tag}`] = new algo.RoundRobinLoadBalancer()),
                        Boolean(b = balancerSubset[`${name}-${target.tag}`]) || (b = balancerSubset[`${name}-${target.tag}`] = {}),
                        // b.set(target.addr, target.weight),
                        b[target.addr] = target.weight,
                        balancerSubset[`${name}-${target.tag}`] = b
                      )
                    )
                  )()
                ),
                // update balancer subset in __balancers
                Object.entries(balancerSubset).forEach(
                  ([k,v]) => (
                    console.log(`update balancer ${k}: ${JSON.stringify(v)}`),
                    __balancers[k] = new algo.RoundRobinLoadBalancer(v)
                  )
                )
              ),

              a.instance?.forEach(
                //instance
                i => (
                  i.port.$ = (os.env.OUTBOUND_PORT | 0) || 8081,
                  i.hostName = loopback,
                  i.ipAddr = loopback
                )
              )
            )
          ),
          //cache delta version
          data.applications['versions__delta'] > 1 && _g.deltaVersion < data.applications['versions__delta'] && (
            _g.deltaVersion = data.applications['versions__delta'],
            console.log('services: ' + JSON.stringify(__services))
            ),
          // persist mapping to local file
          os.writeFile(_localMappingFile, JSON.stringify(_mapping)),
          new Message(msg.head, JSON.encode(data))
        ) : (
          new Message(msg.head, msg.body)
        )
      )
    )()
  )