pipy()

.pipeline('request')
  // .decompressHTTP()
  .replaceMessage(
    msg => (
      console.log(`req path: ${msg.head.path}`),
      console.log(`req method: ${msg.head.method}`),
      console.log(`req headers: ${JSON.stringify(msg.head.headers)}`),
      msg.body && console.log(`req body: ${msg.body}`),
      msg
    )

  )

.pipeline('response')
  .decompressHTTP()
  .replaceMessage(
    msg => (
      msg.head && (msg.head.headers['content-encoding'] = '*'),
      msg.head && console.log(JSON.stringify(msg.head)),
      msg.head && console.log(`res status: ${msg.head.status}`),
      msg.body && console.log(`res body: ${msg.body}`),
      new Message(msg.head, msg.body)
    )
  )