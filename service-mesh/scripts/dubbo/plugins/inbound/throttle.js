/**
 * throttle is service level
 */
(config => (
pipy({
  _app: config.apps?.[os.env['SERVICE_NAME']],
})

.pipeline('request')
  .link(
    'throttle', () => _app?.rateLimit,
    'bypass'
    )

.pipeline('throttle')
  .throttleMessageRate(
    () => _app?.rateLimit,
    ''
  )

.pipeline('bypass')

))(JSON.decode(pipy.load('config/inbound/throttle.json')))