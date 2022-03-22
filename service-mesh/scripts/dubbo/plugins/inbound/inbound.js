pipy({
  _target: '127.0.0.1:20880'
})

.pipeline('request')
  .mux('connection', '')

.pipeline('connection')
  .encodeDubbo()
  .connect(
    () =>  _target
  )
  .decodeDubbo()