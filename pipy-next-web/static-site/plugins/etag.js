pipy({
  _etag: Date.now(),
})

.import({
  __turnDown: 'main',
})

.pipeline('request')
  .handleMessageStart(
    msg => msg?.head?.headers?.['if-none-match'] == _etag && (
      __turnDown = true
    )
  )
  .replaceMessage(
    msg => __turnDown ? (
      new Message({status: 304, headers: {}}, null)
    ) : msg
  )

.pipeline('response')
  .handleMessageStart(
    msg => (
      msg?.head?.headers['etag'] = _etag
    )
  )