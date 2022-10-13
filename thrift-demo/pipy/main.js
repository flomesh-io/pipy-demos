((
  config = pipy.solve('config.js'),
) =>
  pipy()

    .export('main', {
      __service: undefined,
    })
    .listen(config.listen)
    .decodeThrift({ payload: true })
    .demuxQueue().to(
      $ => $.chain(config.plugins)
    )
    .encodeThrift()
)()