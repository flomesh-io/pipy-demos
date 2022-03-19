pipy()

.listen(8080)
  .demuxHTTP('req')

.pipeline('req')
  .handleMessageStart(
    msg => (
      console.log('Path:', msg.head.path, 'Headers:', msg.head.headers)
    )
  )
  .replaceMessage(
    msg => new Message(
    {
      headers: {
        'content-type': 'application/json'
      }
    },
      JSON.encode(msg.head))
  )