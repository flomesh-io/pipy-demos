((
  config = JSON.decode(pipy.load('config/main.json'))
) => pipy({
  _certificates: Object.fromEntries(
    Object.entries(config.certificates).map(
      ([k, v]) => [
        k, {
          cert: new crypto.CertificateChain(os.readFile(v.cert)),
          key: new crypto.PrivateKey(os.readFile(v.key)),
        }
      ]
    )
  ),
})

  .export('main', {
    __service: undefined,
  })

  .listen(config.listen)
  .demuxHTTP().to(
    $ => $.chain(config.plugins)
  )

  .listen(config.listenTLS, { maxConnections: config.maxConnections })
  .acceptTLS({
    certificate: (sni, cert) => (
      sni && Object.entries(_certificates).find(([k, v]) => new RegExp(k).test(sni))?.[1]
    )
  }).to('tls-offloaded')

  .pipeline('tls-offloaded')
  .demuxHTTP().to(
    $ => $.chain(config.plugins)
  )


  //simulating upstream
  .listen(8081)
  .serveHTTP(new Message("I'm hello.com"))
  .listen(8082)
  .serveHTTP(new Message("I'm hello.io"))
)()