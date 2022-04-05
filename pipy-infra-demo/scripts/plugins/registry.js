((eureka, instance, enabled, service, healthcheckPath, instanceId, targetAddr, targetPort,) => (

  enabled = instance.metadata?.labels && instance.metadata.labels['infra.flomesh.io/registry'] == 'true',
  enabled && (
  service = instance?.spec.containers[0]?.env && instance.spec.containers[0].env.find(e => e.name == 'spring.application.name')?.value,
    healthcheckPath = instance?.spec.containers[0]?.readinessProbe?.httpGet?.path,
    healthcheckPath == undefined && (healthcheckPath = '/actuator/health'),
    targetAddr = instance.status.podIP,
    targetPort = instance?.spec.containers[0]?.ports && +instance.spec.containers[0].ports[0]?.containerPort,
    instanceId = `${instance.metadata.name}:${service}:${targetPort}`,
    targetPort += 10
  ),

  (!enabled || !service || !healthcheckPath || !targetAddr || !targetPort) ? pipy().pipeline('init') : (
    pipy({
      instanceFunc: ((ins) => (
        ins = {
          "instanceId": `${instanceId}`,
          "hostName": targetAddr,
          "app": `${service.toUpperCase()}`,
          "ipAddr": targetAddr,
          "status": "UP",
          "overriddenStatus": "UNKNOWN",
          "port": {
            "$": targetPort,
            "@enabled": "true"
          },
          "securePort": {
            "$": 443,
            "@enabled": "false"
          },
          "countryId": 1,
          "dataCenterInfo": {
            "@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
            "name": "MyOwn"
          },
          "leaseInfo": {
            "renewalIntervalInSecs": eureka.client.heartbeatInterval,
            "durationInSecs": 90,
            "registrationTimestamp": 0,
            "lastRenewalTimestamp": 0,
            "evictionTimestamp": 0,
            "serviceUpTimestamp": 0
          },
          "metadata": {
            "management.port": `${targetPort}`
          },
          "homePageUrl": `http://${targetAddr}:${targetPort}/`,
          "statusPageUrl": `http://${targetAddr}:${targetPort}/actuator/info`,
          "healthCheckUrl": `http://${targetAddr}:${targetPort}/actuator/health`,
          "vipAddress": `${service.toLowerCase()}`,
          "secureVipAddress": `${service.toLowerCase()}`,
          "isCoordinatingDiscoveryServer": "false",
          "lastUpdatedTimestamp": `${Date.now()}`,
          "lastDirtyTimestamp": `${Date.now()}`
        },
        ins
      )),
      _g: {
        _healthy: false,
        _registered: false,
        _lastDirtytime: 0,
        _remoteStatus: '',
        _requreStatusUpdate: false,
        _terminated: false,
      }
    })

      .pipeline('init') //init hook

      // for pod preStop hook  
      .listen(8762)
        .link('terminating')

      // healthcheck
      .task(eureka.client.healthcheckInterval)
        .link('healthcheck', () => !_g._terminated)
        .replaceMessage(new StreamEnd)

      // heartbeat
      .task(eureka.client.heartbeatInterval)
        .link('heartbeat', () => !_g._terminated)
        .replaceMessage(new StreamEnd)

      // handle process signal
      .task('SIGINT')
        .link('pre-terminating')
      .task('SIGTERM')
          .link('pre-terminating')

      .pipeline('pre-terminating')
        .link('deregister', () => !_g._terminated && _g._registered)
        .replaceMessage(new StreamEnd)
        .handleStreamEnd(
          () => pipy.exit()
        )

      .pipeline('healthcheck')
        .replaceMessage(
          () => new Message(
            {
              method: 'GET',
              path: `${healthcheckPath}`,
              headers: {
                "host": `localhost:${targetPort}`,
                "user-agent": "curl/7.64.1",
                "accept": "application/json",
                'accept-encoding': 'gzip',
              },
            },
            ''
          )
        )
      .link('forward')
        .replaceMessage(
          (msg, currentStatus) => (
            currentStatus = JSON.decode(msg.body)?.status,
            currentStatus == undefined && msg.head?.status == 200 && (currentStatus = 'UP'),
            _g._healthy = msg.head?.status == 200 && currentStatus.toLowerCase() == 'up',
            Boolean(currentStatus) && (
              (currentStatus.toLowerCase() != _g._remoteStatus.toLowerCase() && _g._registered) && (_g._requreStatusUpdate = true)
            ),
            msg
          )
        )
        .link(
          'deregister', () => !_g._healthy && _g._registered,
          'register', () => _g._healthy && !_g._registered,
          'status-update', () => _g._registered && _g._requreStatusUpdate,
          ''
        )

      //register
      .pipeline('register')
        .replaceMessage(
          (head, body) => (
            head = {
              path: `/eureka/apps/${service.toUpperCase()}`,
              method: 'POST',
              headers: {
                "accept-encoding": "gzip",
                "content-type": "application/json",
                "accept": "application/json",
                "transfer-encoding": "chunked",
                "host": "eureka:8761",
                "connection": "Keep-Alive",
                "user-agent": "Java-EurekaClient/v1.10.11"
              },
            },
            body = {
              "instance": instanceFunc()
            },
            _g._lastDirtytime = body.instance.lastDirtyTimestamp,
            new Message(head, JSON.encode(body))
          )
        )
        .use([
          'main.js',
        ],
          'request',
        )
        .handleMessageStart(
          msg => (
            (msg.head.status >= 200 && msg.head.status < 300) && (
              _g._registered = true,
              _g._remoteStatus = 'UP',
              _g._requreStatusUpdate = false
            )
          )
        )

      //update status
      .pipeline('status-update')
        .replaceMessage(
          () => (
            _g._lastDirtytime = Date.now(), // update now?
            new Message(
              {
                method: 'PUT',
                path: `/eureka/apps/${service.toUpperCase()}/${instanceId}/status?value=${_g._remoteStatusUP ? 'DOWN' : 'UP'}&lastDirtyTimestamp=${_g._lastDirtytime}`,
                headers: {
                  "accept-encoding": "gzip",
                  "host": "192.168.1.101:8761",
                  "connection": "Keep-Alive",
                  "user-agent": "Java-EurekaClient/v1.10.11"
                },
              },
              null
            )
          )
        )
        .link('forward')
        .handleMessageStart(
          msg => (
            msg.head.status == 200 ? (
              console.log('status update success'),
              _g._remoteStatusUP = !_g._remoteStatusUP,
              _g._requreStatusUpdate = false
            ) : (
              // status update failed
              console.log('status update failed')
            )
          )
        )

      //heartbeat
      .pipeline('heartbeat')
        .link(
          'send-heartbeat', () => _g._healthy && _g._registered,
          ''
        )
        .pipeline('send-heartbeat')
        .replaceMessage(
          () => new Message(
            {
              method: 'PUT',
              path: `/eureka/apps/${service.toUpperCase()}/${instanceId}?status=UP&lastDirtyTimestamp=${_g._lastDirtytime}`,
              headers: {
                "accept-encoding": "gzip",
                "host": "eureka:8761",
                "connection": "Keep-Alive",
                "user-agent": "Java-EurekaClient/v1.10.11"
              },
            },
            null
          )
        )
        .link('forward')
        .handleMessageStart(
          msg => msg.head.status == 404 && (
            _g._registered = false,
            _g._remoteStatus = '',
            _g._requreStatusUpdate = false
          )
        )
        .link(
          'register', () => !_g._registered,
          ''
        )

      //deregister
      .pipeline('deregister')
        .handleStreamStart(
          () => _g._terminated = true
        )
        .replaceMessage(
          () => new Message(
            {
              method: 'DELETE',
              path: `/eureka/apps/${service.toUpperCase()}/${instanceId}`,
              headers: {
                "host": "eureka:8761",
                "user-agent": "curl/7.64.1",
                "accept": "application/json",
                'accept-encoding': 'gzip',
              },
            },
            ''
          )
        )
        .link('forward')
        .handleMessageStart(
          msg => (
            msg.head.status == 200 || msg.head.status == 404 ? (
            _g._registered = false,
            _g._remoteStatus = '',
            _g._requreStatusUpdate = false
          ) : (
            _g._terminated = false
          )
          )
        )

      //hook pod terminating via preStop
      .pipeline('terminating')
        .demuxHTTP('deregister')
        .handleMessageStart(
          msg => (
            msg.head.status == 200 && (
              _g._terminated = true
            ),
            new Message(msg.head, '')
          )
        )
        // .encodeHTTPResponse()

      // for all logics to log req and res
      .pipeline('forward')
        .use([
          'main.js',
        ],
          'request',
        )
  )
)
)(
  JSON.decode(pipy.load('config/eureka.json')),
  JSON.decode(pipy.load('config/pod.json'))
)