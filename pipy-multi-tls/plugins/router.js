((
  config = JSON.decode(pipy.load('config/router.json')),
  router = new algo.URLRouter(config.routes)
) => pipy()

  .import({
    __service: 'main'
  })

  .pipeline()
  .handleMessageStart(
    msg => (
      __service = router.find(
        msg.head.headers.host,
        '',
      )
    )
  )
  .chain()

)()