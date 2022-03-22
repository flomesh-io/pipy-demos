//taking router role
pipy({
  _target: '127.0.0.1:' + (os.env.TARGET_PORT || 8080)
})

.pipeline('request')
  .muxHTTP(
    'connection',
    () => _target
  )

.pipeline('connection')
  .connect(
    () => _target
  )