(config =>

  pipy({
    _pubkey: pipy.load(config.oauth.pubkey),
    _issuer: config.oauth.issuer,
    _services: config.oauth.services,
  })

    .import({
      __turnDown: 'proxy',
      __serviceID: 'router',
      __role: 'router',
    })

    .pipeline('request')
    .replaceMessage(
      msg => (
        ((
          header,
          jwt,
        ) => (
          _services.includes(__serviceID) ? (
            msg.head.headers.authorization ? (
              header = msg.head.headers.authorization,
              header.startsWith('Bearer ') && (header = header.substring(7)),
              jwt = new crypto.JWT(header),
              jwt.isValid ? (
                jwt.verify(_pubkey) ? (
                  _issuer && jwt.payload?.iss == _issuer ? (
                    jwt.payload?.exp && ((jwt.payload?.exp - Date.now() / 1000) > 0) ? (
                      jwt.payload?.resource_access["pipy-oidc-proxy"]?.roles.includes(__role) ? (msg) :
                        (
                          __turnDown = true,
                          new Message({ status: 403 }, 'Forbidden: Access denied')
                        )
                    ) : (
                      __turnDown = true,
                      new Message({ status: 401 }, 'Token is expired')
                    )
                  ) : (
                    __turnDown = true,
                    new Message({ status: 401 }, 'Issuer is not valid')
                  )
                ) : (
                  __turnDown = true,
                  new Message({ status: 401 }, 'Invalid signature')
                )
              ) : (
                __turnDown = true,
                new Message({ status: 401 }, 'Invalid token')
              )
            ) : (
              __turnDown = true,
              new Message({ status: 403 }, 'Access denied')
            )
          ) : msg
        ))()
      )
    )

)(JSON.decode(pipy.load('config/jwt.json')))
