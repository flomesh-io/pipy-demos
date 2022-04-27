(config =>
pipy()

.pipeline('request')
  .handleMessageStart(
    msg => config.tags && Object.entries(config.tags).length > 0 && (
      msg.head.properties ? (
        msg.head.properties.assign(config.tags)
      ) : (
        msg.head.properties = config.tags
      )
    )
  )

)(JSON.decode(pipy.load('config/tag.json')))