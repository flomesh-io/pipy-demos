(config =>
pipy()

.listen(8080)
  .serveHTTP(
    () => new Message(`Hi, there! This is from ${config.bgp_id}. \n`)
  )

// .task('10s')
//   .use(
//     [
//       'plugins/bgp.js',
//     ],
//     'bgp'
//   )  
)(JSON.decode(pipy.load('config/bgp.json')))
