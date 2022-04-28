pipy()

.pipeline('response')
  .handleMessageStart(
    msg => msg?.head?.headers['server'] = 'pipy'
  )