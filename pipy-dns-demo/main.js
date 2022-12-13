((
  config = { upstreamDNSServer: '1.1.1.1' },
  {
    local
  } = pipy.solve('records.js'),
  {
    setDNS,
    getDNS,
  } = pipy.solve('cache.js'),
) =>

  pipy({
    _forward: false,
  })
    .listen(5300, { protocol: 'udp' })
    .replaceMessage(
      msg => (
        (query, res, record) => (
          query = DNS.decode(msg.body),
          //valid query
          query?.question?.[0]?.name && query?.question?.[0]?.type && (
            //query cache
            record = getDNS(query.question[0].type + '#' + query.question[0].name)
            || local.query(query.question[0].name, query.question[0].type)
          ),
          record ? (
            res = {},
            res.qr = res.rd = res.ra = res.aa = 1,
            res.id = query.id,
            res.question = [{
              'name': query.question[0].name,
              'type': query.question[0].type
            }],
            record.status === 'deny' ? (
              res.rcode = local.code.REFUSED
            ) : (
              res.answer = record.rr
            ),
            new Message(DNS.encode(res))
          ) : (
            _forward = true,
            msg
          )
        )
      )()
    ).branch(
      () => _forward, $ => $
        .connect(() => `${config.upstreamDNSServer}:53`, { protocol: 'udp' })
        .handleMessage(
          msg => (
            (res = DNS.decode(msg.body)) => (
              res?.question?.[0]?.name && res?.question?.[0]?.type &&
              !res?.rcode && (
                setDNS(res.question[0].type + '#' + res.question[0].name,
                  {
                    rr: res.answer,
                    status: res.rcode == local.code.REFUSED ? 'deny' : null
                  }
                )
              )
            )
          )()
        ),
      $ => $
    )
)()