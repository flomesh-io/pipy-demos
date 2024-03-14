pipy({
  _reqObj: undefined,
  _reqDubbo: undefined,
  _dubboStruct: [
    '2.0.2',
    'io.flomesh.demo.api.BookWarehouseService',
    'v1',
    'getBook',
    'Ljava/lang/String;',
    '#id',
    {
      'kind': 'map',
      'elements': [
        [
          'input',
          '196'
        ],
        [
          'path',
          'io.flomesh.demo.api.BookWarehouseService'
        ],
        [
          'interface',
          'io.flomesh.demo.api.BookstoreService'
        ],
        [
          'version',
          'v1'
        ]
      ]
    }
  ],
})

  .listen(8888)
  .demuxHTTP().to(
    $ => $
      .replaceMessage(
        msg => (
          _reqObj = JSON.decode(msg.body),
          (msg.head?.path === '/v1/getBook' && _reqObj.id > 0) ? (
            _reqDubbo = _dubboStruct.map(e => (e === '#id' ? '' + _reqObj.id : e)),
            new Message(
              {
                isRequest: true,
                isTwoWay: true,
                serializationType: 2
              },
              Hessian.encode(_reqDubbo)
            )
          ) : (
            _reqDubbo = null,
            new Message({ status: 404 })
          )
        )
      )
      .branch(
        () => _reqDubbo, (
        $ => $
          .mux().to(
            $ => $
              .encodeDubbo()
              .connect('localhost:20880')
              .decodeDubbo()
          )
          .replaceMessage(
            msg => new Message(
              JSON.encode(
                Hessian.decode(msg.body).map(
                  e => (
                    e?.kind === 'object' ? e.elements : null
                  )
                ).filter(e => e)?.[0],
                (k, v) => (branch(
                  v instanceof Int, () => v.valueOf(),
                  v instanceof Date, () => v.toISOString(),
                  v
                )), 2
              )
            )
          )
      ),
        () => _reqDubbo === null, (
        $ => $
      )
      )
  )

