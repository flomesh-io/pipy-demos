pipy()

.listen(8081)
  .serveHTTP(
    new Message('User service called')
  )

.listen(8082)
  .serveHTTP(
    msg => new Message('Admin service called')
  )
