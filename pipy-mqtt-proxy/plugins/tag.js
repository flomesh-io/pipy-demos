import config from '/config.js'

export default pipeline($ => $
  .handleMessageStart(function (msg) {
    if (config.tags && Object.entries(config.tags).length > 0) {
      if (msg.head.properties) {
        Object.assign(msg.head.properties, config.tags)
      } else {
        msg.head.properties = config.tags
      }
    }
  })
  .pipeNext()
)