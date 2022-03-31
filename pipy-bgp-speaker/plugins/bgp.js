(config =>

pipy({
  _bgp_header: null,
  _bgp_open_fields: null,
  _bgp_update_fields: null,

  _bgp_open_msg: null,
  _bgp_update_msg: null,
  _bgp_keepalive_msg: null,

  _bgp_buf: null,
  _bgp_withdraw_routes: null,
  _bgp_withdraw_len: null,
  _bgp_origin: null,
  _bgp_path_header: null,

  _bgp_as_path: null,
  _bgp_asn_seq: null,
  _bgp_seq_buf: null,

  _bgp_attrs: null,
  _bgp_path_attr: null,
  _bgp_nexthop: null,
  _bgp_prefixes: null,
  _bgp_nlri: null,

  _g: {
    state: undefined
  }
})

.listen(179)
  .dummy()
  // .dump()

// // Register ip to loopback
// .task()
//   .exec(`ip addr add ${config.prefixes[0]} dev lo`)

// // TODO: Deregister ip from loopback
// .task('SIGINT')
//   .exec(`ip addr del ${config.prefixes[0]} dev lo`)

// OPEN => KEEPALIVE => UPDATE => KEEPALIVE (again...)
.pipeline('bgp')
  .replaceMessage(msg => (
    (_g.state === undefined ? (
      _bgp_header =  new Array(16).fill(0xff).concat(new Array(3).fill(0)),
      _bgp_header[18] = 1, // Type: OPEN

      _bgp_open_fields = new Array(5).fill(0),
      _bgp_open_fields[0] = 4,

      // my_asn
      _bgp_open_fields[1] = 255 & (config.my_asn >> 8),
      _bgp_open_fields[2] = 255 & config.my_asn,

      // hold_timer
      _bgp_open_fields[3] = 255 & (config.hold_time >> 8),
      _bgp_open_fields[4] = 255 & config.hold_time,

      _bgp_open_fields = _bgp_header.concat(_bgp_open_fields, config.bgp_id.split('.').map(n => n|0), new Array(1).fill(0)),
      _bgp_open_fields[16] = 255 & (_bgp_open_fields.length >> 8),
      _bgp_open_fields[17] = 255 & _bgp_open_fields.length,

      _bgp_open_msg = _bgp_open_fields,
      _g.state = 'OPEN',

      _bgp_header =  new Array(16).fill(0xff).concat(new Array(3).fill(0)),
      _bgp_header[17] = 19, // length: 19
      _bgp_header[18] = 4, // Type: KEEPALIVE

      _bgp_keepalive_msg = _bgp_header,

      [new Message(new Data(_bgp_open_msg)), new Message(new Data(_bgp_keepalive_msg))]

    ) : (_g.state === 'OPEN' ? (
      _bgp_header =  new Array(16).fill(0xff).concat(new Array(3).fill(0)),
      _bgp_header[18] = 2, // Type: UPDATE

      // withdraw_routes
      _bgp_buf = new Array(0).fill(0),
      config.withdraw_routes.forEach(prefix => (
        void ((
          length, _prefix, bytes,
        ) => (
          length = prefix.split('/')[1],
          _prefix = prefix.split('/')[0],
          bytes = Math.ceil(length / 8),
          _bgp_buf = _bgp_buf.concat(_bgp_buf, new Array(1).fill(length), _prefix.split('.').slice(0, bytes).map(n => n|0))
        ))()
      )),

      _bgp_withdraw_len = new Array(2).fill(0),
      _bgp_withdraw_len[0] = 255 & (_bgp_buf.length >> 8),
      _bgp_withdraw_len[1] = 255 & _bgp_buf.length,
      _bgp_withdraw_routes =  [ ..._bgp_withdraw_len, ..._bgp_buf ],

      // path_header [optional = 0, trans = 0, partial = 0, extended = 0, type]
      _bgp_path_header = [ [0, 1, 0, 0, 0, 0, 0, 0].reduce((a, b) => (b|0)+((a|0)<<1)), 1 ],

      _bgp_origin = [ ..._bgp_path_header, ...new Array(1).fill(1), ...new Array(1).fill(2) ], // origin: INCOMPLETE

      void ((
        as_buf,
      ) => (
        _bgp_asn_seq = new Array(0).fill(0),
        config.as_path.forEach(as => (
          as_buf = new Array(2).fill(0), // TODO 4b
          as_buf[0] = 255 & (as >> 8),
          as_buf[1] = 255 & as,

          _bgp_asn_seq = _bgp_asn_seq.concat(as_buf)
        )),

        _bgp_seq_buf = [ 
          ...new Array(1).fill(2), // AS_SEQUENCE
          ...new Array(1).fill(config.as_path.length), // # of ASNs in path
          ..._bgp_asn_seq 
        ],

        // path_header [optional = 0, trans = 0, partial = 0, extended = 0, type]
        _bgp_path_header = [ [0, 1, 0, 0, 0, 0, 0, 0].reduce((a, b) => (b|0)+((a|0)<<1)), 2 ],
        _bgp_as_path = [ ..._bgp_path_header, ...new Array(1).fill(_bgp_seq_buf.length), ..._bgp_seq_buf ]
      ))(),

      // path_header [optional = 0, trans = 0, partial = 0, extended = 0, type]
      _bgp_path_header = [ [0, 1, 0, 0, 0, 0, 0, 0].reduce((a, b) => (b|0)+((a|0)<<1)), 3 ],
      _bgp_nexthop = [ 
        ..._bgp_path_header, 
        ...new Array(1).fill(4), // length = 4
        ...config.nexthop.split('.').map(n => n|0)
      ],

      void ((
        buf, length, _prefix, bytes,
      ) => (
        buf = new Array(0).fill(0),
        config.prefixes.forEach(prefix => (
          length = prefix.split('/')[1] | 0,
          _prefix = prefix.split('/')[0],

          bytes = Math.ceil(length / 8),
          buf = buf.concat(new Array(1).fill(length), _prefix.split('.').slice(0, bytes).map(n => n|0))
        )),
        _bgp_prefixes = buf
      ))(),

      void ((
        buf, attrs, attrs_len,
      ) => (
        attrs = [ ..._bgp_origin, ..._bgp_as_path, ..._bgp_nexthop ],
        buf = new Array(0).fill(0),
        attrs.forEach(attr => (
          buf = buf.concat(attr)
        )),
        attrs_len = new Array(2).fill(0),
        attrs_len[0] = 255 & (buf.length >> 8),
        attrs_len[1] = 255 & buf.length,

        _bgp_path_attr = [ ...attrs_len, ...buf ]
      ))(),

      _bgp_nlri = _bgp_prefixes,

      _bgp_update_fields = [ ..._bgp_header, ..._bgp_withdraw_routes, ..._bgp_path_attr, ..._bgp_nlri ],
      _bgp_update_fields[16] = 255 & (_bgp_update_fields.length >> 8),
      _bgp_update_fields[17] = 255 & _bgp_update_fields.length,

      _bgp_update_msg = _bgp_update_fields,
      _g.state = 'UPDATE',
      new Message(new Data(_bgp_update_msg))

    ) : (
      _bgp_header =  new Array(16).fill(0xff).concat(new Array(3).fill(0)),
      _bgp_header[17] = 19, // length: 19
      _bgp_header[18] = 4, // Type: KEEPALIVE

      _bgp_keepalive_msg = _bgp_header,
      new Message(new Data(_bgp_keepalive_msg))
    ))
  )))
  .merge('send', '', { maxIdle: '1m' })
  .replaceMessage(msg => new StreamEnd)

.pipeline('send')
  .dump()
  .connect(config.bgp_addr)
  // .dump()

)(JSON.decode(pipy.load('../config/bgp.json')))
