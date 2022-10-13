((
  config = pipy.solve('config.js'),
) => pipy()

  .pipeline()

  .import({
    __service: 'main',
  })

  .handleStreamStart(
    () => ((
      originDST
    ) => (
      // with iptables and tproxy, obtain origin desination address and port from __inbound variable
      // here, mock origin destination with local address and port
      // originDST = `${__inbound.destinationAddress}_${__inbound.destinationPort}`,
      originDST = `${__inbound.localAddress}_${__inbound.localPort}`,
      __service = config.routes[originDST]
    ))()
  )
  .chain()
)()