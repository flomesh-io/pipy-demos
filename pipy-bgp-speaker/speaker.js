pipy()

.task('10s')
  .onStart(() => new Message)
  .use(
    [
      'plugins/bgp.js',
    ],
    'bgp'
  )
