(config =>

pipy({
  _bgp_msg_header: null,

  _bgp_open_msg: null,
  _bgp_update_msg: null,
  _bgp_keepalive_msg: null,

  _bgp_open_msg_body: null,
  _bgp_update_msg_body: null,

  _bgp_response_msg_type: null,
  _bgp_response_msg_length: null,

  CONSTANTS_BGP_MSG_TYPE_NOTIFICATION: 3,
  CONSTANTS_BGP_MSG_TYPE_KEEPALIVE: 4,

  _g: {
    state: undefined
  }
})

.listen(179)
  .dummy()
  // .dump()

// BGP Message Header Format
// Marker(16) + Length(2) + Type(1) = 19 octets

// Marker (16 octets)
// Indicates whether the information synchronized between BGP peers
// is complete. This field is used for calculation in BGP authentication. 
// If no authentication is used, the field is set to all ones in binary 
// format or all Fs in hexadecimal notation.

// Length (2 octets, unsigned integer)
// Indicates the total length of a BGP message (including the header), 
// in octets. The length ranges from 19 octets to 4096 octets.

// Type (1 octets, unsigned integer)
// Indicates the message type. The value of this field is an integer ranging from 1 to 5.
// Type Code / Message Type
// 1 Open
// 2 Update
// 3 Notification
// 4 Keepalive
// 5 Route-refresh

// OPEN => KEEPALIVE => UPDATE => KEEPALIVE (again...)
.pipeline('bgp')
  .replaceMessage(msg => (
    (_g.state === undefined ? (
      // Open messages are used to establish BGP connections.

      // Open Message Format
      // Version
      // 1 octet (unsigned integer)
      // Indicates the BGP version number. For BGP-4, the value of the field is 4.

      // My Autonomous System
      // 2 octets (unsigned integer)
      // Indicates the AS number of the message sender.

      // Hold Time
      // 2 octets (unsigned integer)
      // Indicates the hold time set by the message sender, in seconds. 
      // BGP peers use this field to negotiate the interval at which 
      // Keepalive or Update messages are sent so that the peers can maintain 
      // the connection between them. Upon receipt of an Open message, the 
      // finite state machine (FSM) of a BGP speaker must compare the locally 
      // configured hold time with that carried in the received Open message. 
      // The FSM uses the smaller value as the negotiation result. The value 
      // is greater than or equal to 3. A value of 0 indicates that no Keepalive 
      // messages are sent. The default value is 180.

      // BGP Identifier
      // 4 octets (unsigned integer)
      // Indicates the router ID of the message sender.

      // Opt Parm Len
      // 1 octet (unsigned integer)
      // Indicates the length of the Optional Parameters field. If the value 
      // is 0, no optional parameters are used.

      // Optional Parameters
      // Variable
      // Indicates a list of optional BGP parameters, with each one representing 
      // a unit in TLV format.

      _bgp_msg_header =  new Array(16).fill(0xff).concat(new Array(3).fill(0)),
      _bgp_msg_header[18] = 1, // Message Type: OPEN

      void ((
        version,
        asn,
        asn4,
        hold_time,
        opt_params,
        param,
        capability,
        afi,
        safi,
      ) => (
        // Version
        version = new Array(1).fill(4),

        // My Autonomous System
        asn = new Array(2).fill(0),
        asn[0] = 255 & (config.my_asn >> 8),
        asn[1] = 255 & config.my_asn,

        // Hold Time
        hold_time = new Array(2).fill(0),
        hold_time[0] = 255 & (config.hold_time >> 8),
        hold_time[1] = 255 & config.hold_time,

        // Optional Parameters
        opt_params = [],

        // +------------------------------+
        // | Capability Code (1 octet)    |
        // +------------------------------+
        // | Capability Length (1 octet)  |
        // +------------------------------+
        // | Capability Value (variable)  |
        // +------------------------------+

        param = [],
        (config.asn4 ? (
          asn4 = new Array(4).fill(0),
          asn4[0] = 255 & (config.my_asn >> 24),
          asn4[1] = 255 & (config.my_asn >> 16),
          asn4[2] = 255 & (config.my_asn >> 8),
          asn4[3] = 255 & config.my_asn,

          capability = [
            ...new Array(1).fill(0x41),
            ...new Array(1).fill(4),
            ...asn4
          ],

          param = [
            ...new Array(1).fill(2),
            ...new Array(1).fill(capability.length),
            ...capability
          ],
          opt_params = [
            ...opt_params,
            ...param
          ]
        ) : (
          // Unchanged
          asn = new Array(2).fill(0),
          asn[0] = 255 & (config.my_asn >> 8),
          asn[1] = 255 & config.my_asn
        )),

        // // Multiprotocol extentions capability
        // config.afi_safi.forEach(afi_safi_arr => (
        //   afi = afi_safi_arr[0],
        //   safi = afi_safi_arr[1],
        //   capability = [
        //     ...new Array(1).fill(0x01),
        //     ...new Array(1).fill(4),
        //     4, afi, 0, safi
        //   ],
        //   param = [
        //     ...new Array(1).fill(2),
        //     ...new Array(1).fill(capability.length),
        //     ...capability
        //   ],
        //   opt_params = [
        //     ...opt_params,
        //     ...param
        //   ]
        // )),

        _bgp_open_msg_body = [
          ...version,
          ...asn,
          ...hold_time,

          // BGP Identifier
          // Format: x.x.x.x
          // Recommend: IPv4 Address
          ...config.bgp_id.split('.').map(n => n|0), new Array(1).fill(0),

          ...new Array(1).fill(opt_params.length),
          ...opt_params
        ],

        _bgp_open_msg = [ 
          ..._bgp_msg_header, 
          ..._bgp_open_msg_body
        ],
        _bgp_open_msg[16] = 255 & (_bgp_open_msg.length >> 8),
        _bgp_open_msg[17] = 255 & _bgp_open_msg.length
      ))(),

      _g.state = 'OPEN',

      _bgp_msg_header = new Array(16).fill(0xff).concat(new Array(3).fill(0)),
      _bgp_msg_header[17] = 19, // Message Length: 19
      _bgp_msg_header[18] = 4, // Message Type: KEEPALIVE

      _bgp_keepalive_msg = _bgp_msg_header,

      [new Message(new Data(_bgp_open_msg)), new Message(new Data(_bgp_keepalive_msg))]

    ) : (_g.state === 'OPEN' ? (
      // Update messages are used to transfer routing information between BGP peers.

      // Update Message Format
      // Unfeasible Routes Length 
      // 2 octets (unsigned integer)
      // Indicates the length of the Withdrawn Routes field, in octets. 
      // If the value is 0, the Withdrawn Routes field is omitted.

      // Withdrawn Routes
      // variable
      // Contains a list of routes to be withdrawn. Each entry in 
      // the list contains the Length (1 octet) and Prefix (length-variable) 
      // fields.

      // Total Path Attribute Length
      // 2 octets
      // Indicates the total length of the Path Attributes field.
      // If the value is 0, both the Network Layer Reachability 
      // Information field and the Path Attributes field are omitted 
      // in the Update message.

      // Path Attributes
      // variable
      // Indicates a list of path attributes in the Update message.
      // The type codes of the path attributes are arranged in ascending order.

      // Network Layer Reachability Information (NLRI)
      // variable
      // Indicates a list of IP address prefixes in the Update message.

      _bgp_msg_header = new Array(16).fill(0xff).concat(new Array(3).fill(0)),
      _bgp_msg_header[18] = 2, // Message Type: UPDATE      

      void ((
        buf,
        asn_seq,
        asn_path,

        seg_type,
        as_seg,
        as_num,
        as_path_list,
        as_path,

        prefix_length,
        prefix_bytes,

        attrs,
        nexthop,

        afi,
        safi,
        mp_reach_nlri,
        prefix,
        prefix_ipv6,
        prefix_ipv6_length,
        path_attr_next_hop_ipv6,

        path_attr_header,
        path_attr_origin,
        path_attr_as_path,
        path_attr_next_hop,
        path_attr_multi_exit_disc,
        path_attr_local_pref,
        path_attr_atomic_aggregate,
        path_attr_aggregator,
        path_attr_community,
        path_attr_originator_id,
        path_attr_cluster_list,
        path_attr_mp_reach_nlri,
        path_attr_mp_unreach_nlri,
        path_attr_extended_communities,

        unfeasible_routes_length,
        withdrawn_routes,
        total_path_attr_length,
        path_attrs,
        nlri,
      ) => (
        // Withdrawn Routes
        // TODO: ipv6
        withdrawn_routes = new Array(0).fill(0),
        config.withdrawn_routes.forEach(prefix => (
          prefix_length = prefix.split('/')[1],
          prefix_bytes = Math.ceil(prefix_length / 8),

          withdrawn_routes = [
            ...withdrawn_routes,
            ...new Array(1).fill(prefix_length),
            ...prefix.split('/')[0].split('.').slice(0, prefix_bytes).map(n => n|0)
          ]
        )),

        unfeasible_routes_length = new Array(2).fill(0),
        unfeasible_routes_length[0] = 255 & (withdrawn_routes.length >> 8),
        unfeasible_routes_length[1] = 255 & withdrawn_routes.length,

        // Path Attributes
        // Each path attribute is encoded as a TLV (<attribute type, attribute length, attribute value>)

        // BGP Path Attribute TLV Format
        // Attr.Type (16 bits) + Attr.Length (variable) + Attr.Value (variable)
        // Attr.Type occupies two octets (unsigned integer), including the one-octet Flags 
        // field (unsigned integer) and the one-octet Type Code field (unsigned integer).

        // Attr.Flags: occupies one octet (eight bits) and indicates the attribute flag. The
        // meaning of each bit is as follows:
        // O (Optional bit): Defines whether the attribute is optional. The value 1 indicates an optional attribute, whereas the value 0 indicates a well-known attribute.
        // T (Transitive bit): Defines whether the attribute is transitive. For an optional attribute, the value 1 indicates that the attribute is transitive, whereas the value 0 indicates that the attribute is non-transitive. For a well-known attribute, the value must be set to 1.
        // P (Partial bit): Defines whether the information in an optional-transitive attribute is partial. If the information is partial, P must be set to 1; if the information is complete, P must be set to 0. For well-known attributes and for optional non-transitive attributes, P must be set to 0.
        // E (Extended Length bit): Defines whether the length (Attr. Length) of the attribute needs to be extended. If the attribute length does not need to be extended, E must be set to 0 and the attribute length is 1 octet. If the attribute length needs to be extended, E must be set to 1 and the attribute length is 2 octets.
        // U (Unused bits): Indicates that the lower-order four bits of Attr. Flags are not used. These bits are ignored on receipt and must be set to 0.

        // Path Attribute Header
        // [optional = 0, transitive = 0, partial = 0, extended_length = 0, type]

        // transitive: 1, type: 1
        path_attr_header = [ 
          [0, 1, 0, 0, 0, 0, 0, 0].reduce((a, b) => (b|0)+((a|0)<<1)), 
          1 
        ],

        // length: 1
        // 0: IGP, 1: EGP, 2: INCOMPLETE
        path_attr_origin = [
          ...path_attr_header,
          ...new Array(1).fill(1),
          ...new Array(1).fill(config.origin)
        ],

        // TODO
        // AS_Path:
        // 1 AS_SET
        // 2 AS_SEQUENCE
        // 3 AS_CONFED_SET
        // 4 AS_CONFED_SEQUENCE
        // asn4: 4 byte asn
        as_path = [],
        config.as_path.forEach(seg => (
          seg_type = seg[0],
          as_path_list = seg[1],

          as_num = as_path_list.length,
          as_seg = [],

          console.log(as_path_list),
          console.log(`seg_type: ${seg_type}`),
          console.log(`as_num: ${as_num}`),
          console.log('==================='),

          as_path_list.forEach(as => (
            (config.asn4 ? (
              buf = new Array(4).fill(0),
              buf[0] = 255 & (as >> 24),
              buf[1] = 255 & (as >> 16),
              buf[2] = 255 & (as >> 8),
              buf[3] = 255 & as
            ) : (
              buf = new Array(2).fill(0),
              buf[0] = 255 & (as >> 8),
              buf[1] = 255 & as
            )),

            console.log(buf),

            as_seg = as_seg.concat(buf)
          )),

          as_path = [
            ...as_path,
            ...new Array(1).fill(seg_type),
            ...new Array(1).fill(as_num),
            ...as_seg
          ]
        )),
        
        // as_path.length > 255, use extended length bit
        (as_path.length > 255 ? (
          // transitive: 1, extended length: 1, type: 2
          path_attr_header = [ 
            [0, 1, 0, 1, 0, 0, 0, 0].reduce((a, b) => (b|0)+((a|0)<<1)), 
            2 
          ]
        ) : (
          // transitive: 1, type: 2
          path_attr_header = [ 
            [0, 1, 0, 0, 0, 0, 0, 0].reduce((a, b) => (b|0)+((a|0)<<1)), 
            2 
          ]
        )),
        path_attr_as_path = [ 
          ...path_attr_header, 
          ...new Array(1).fill(as_path.length), 
          ...as_path 
        ],

        // transitive: 1, type: 3
        path_attr_header = [ 
          [0, 1, 0, 0, 0, 0, 0, 0].reduce((a, b) => (b|0)+((a|0)<<1)),
          3
        ],
        path_attr_next_hop = [ 
          ...path_attr_header, 
          ...new Array(1).fill(4), // length = 4 octets
          ...config.nexthop.split('.').map(n => n|0)
        ],

        path_attr_multi_exit_disc = [],
        path_attr_local_pref = [],
        path_attr_atomic_aggregate = [],
        path_attr_aggregator = [],
        path_attr_community = [],
        path_attr_originator_id = [],
        path_attr_cluster_list = [],

        // Multiprotocol Reachable NLRI - MP_REACH_NLRI (Type Code 14)
        // +---------------------------------------------------------+
        // | Address Family Identifier (2 octets)                    |
        // +---------------------------------------------------------+
        // | Subsequent Address Family Identifier (1 octet)          |
        // +---------------------------------------------------------+
        // | Length of Next Hop Network Address (1 octet)            |
        // +---------------------------------------------------------+
        // | Network Address of Next Hop (variable)                  |
        // +---------------------------------------------------------+
        // | Reserved (1 octet)                                      |
        // +---------------------------------------------------------+
        // | Network Layer Reachability Information (variable)       |
        // +---------------------------------------------------------+

        (config.ipv6 ? (
          // optional: 1, extended_length: 1, type: 14
          path_attr_header = [ 
            [1, 0, 0, 1, 0, 0, 0, 0].reduce((a, b) => (b|0)+((a|0)<<1)),
            14
          ],

          // AFI (Address Family Identifier)
          // 1: IPv4 address family, 2: IPv6 address family
          
          // SAFI (Subsequent Address Family Identifier)
          // 1: Unicast, 2: Multicast, 128: VPN
          
          // afi: 2, safi: 1
          afi = new Array(2).fill(0),
          afi[0] = 255 & (2 >> 8),
          afi[1] = 255 & 2,

          safi = new Array(1).fill(1),

          nexthop = [],
          config.nexthopIPv6.forEach(hopIPv6 => (
            hopIPv6.split(':').forEach(hop => (
              nexthop = nexthop.concat(
                `0x${hop.slice(0, 2)}` | 0, 
                `0x${hop.slice(2, 4)}` | 0
              )
            ))
          )),

          // path_attr_next_hop_ipv6 = [ 
          //   ...path_attr_header, 
          //   ...new Array(1).fill(nexthop.length),
          //   ...nexthop
          // ],
          path_attr_next_hop_ipv6 = [ 
            ...nexthop
          ],

          mp_reach_nlri = new Array(0).fill(0),
          config.prefixesIPv6.forEach(prefixIPv6 => (
            prefix_length = prefixIPv6.split('/')[1] | 0,
            prefix_bytes = Math.ceil(prefix_length / 8),

            prefix = prefixIPv6.split('/')[0].replace('::', ''),

            prefix_ipv6 = [],
            prefix.split(':').forEach(p => (
              prefix_ipv6 = prefix_ipv6.concat(
                `0x${p.slice(0, 2)}` | 0, 
                `0x${p.slice(2, 4)}` | 0
              )
            )),

            prefix_ipv6_length = new Array(2).fill(0),
            prefix_ipv6_length[0] = 255 & (prefix_length >> 8),
            prefix_ipv6_length[1] = 255 & prefix_length,

            mp_reach_nlri = [
              ...mp_reach_nlri,
              ...prefix_ipv6_length, 
              ...prefix_ipv6
            ]
          )),

          // path_attr_mp_reach_nlri = [ 
          //   ...afi,
          //   ...safi,
          //   // 16
          //   ...new Array(1).fill(config.nexthopIPv6.length * 16), // 16 octets per nexthop
          //   ...path_attr_next_hop_ipv6,
          //   ...new Array(1).fill(0), // Reserved: A 1 octet field that MUST be set to 0,
          //   ...mp_reach_nlri
          // ],
          // console.log(path_attr_mp_reach_nlri),

          path_attr_mp_reach_nlri = [ 
            ...path_attr_header, 
            ...afi,
            ...safi,
            // 16
            ...new Array(1).fill(config.nexthopIPv6.length * 16), // length = 4 * 4 octets
            ...path_attr_next_hop_ipv6,
            ...new Array(1).fill(0), // Reserved: A 1 octet field that MUST be set to 0,
            ...mp_reach_nlri
          ]
        ) : (
          path_attr_mp_reach_nlri = []
        )),
        // path_attr_mp_reach_nlri = [],

        // Multiprotocol Unreachable NLRI - MP_UNREACH_NLRI (Type Code 15)
        // +---------------------------------------------------------+
        // | Address Family Identifier (2 octets)                    |
        // +---------------------------------------------------------+
        // | Subsequent Address Family Identifier (1 octet)          |
        // +---------------------------------------------------------+
        // | Withdrawn Routes (variable)                             |
        // +---------------------------------------------------------+
        path_attr_mp_unreach_nlri = [],
        path_attr_extended_communities = [],

        attrs = [
          ...path_attr_origin, 
          ...path_attr_as_path, 
          ...path_attr_next_hop,
          ...path_attr_multi_exit_disc,
          ...path_attr_local_pref,
          ...path_attr_atomic_aggregate,
          ...path_attr_aggregator,
          ...path_attr_community,
          ...path_attr_originator_id,
          ...path_attr_cluster_list,
          ...path_attr_mp_reach_nlri,
          ...path_attr_mp_unreach_nlri,
          ...path_attr_extended_communities
        ],
        path_attrs = new Array(0).fill(0),
        attrs.forEach(attr => (
          path_attrs = path_attrs.concat(attr)
        )),

        total_path_attr_length = new Array(2).fill(0),
        total_path_attr_length[0] = 255 & (path_attrs.length >> 8),
        total_path_attr_length[1] = 255 & path_attrs.length,

        nlri = new Array(0).fill(0),
        config.prefixes.forEach(prefix => (
          prefix_length = prefix.split('/')[1] | 0,

          prefix_bytes = Math.ceil(prefix_length / 8),
          nlri = [
            ...nlri,
            ...new Array(1).fill(prefix_length), 
            ...prefix.split('/')[0].split('.').slice(0, prefix_bytes).map(n => n|0)
          ]
        )),

        _bgp_update_msg_body = [
          ...unfeasible_routes_length,
          ...withdrawn_routes,
          ...total_path_attr_length,
          ...path_attrs,
          ...nlri
        ],

        _bgp_update_msg = [ ..._bgp_msg_header, ..._bgp_update_msg_body ],
        _bgp_update_msg[16] = 255 & (_bgp_update_msg.length >> 8),
        _bgp_update_msg[17] = 255 & _bgp_update_msg.length
      ))(),

      _g.state = 'UPDATE',

      new Message(new Data(_bgp_update_msg))

    ) : (
      // Keepalive messages are used to maintain BGP connections.
      // Each Keepalive message has only a header; it does not have a 
      // data portion. Therefore, the total length of each Keepalive 
      // message is fixed at 19 octets.
      _bgp_msg_header = new Array(16).fill(0xff).concat(new Array(3).fill(0)),
      _bgp_msg_header[17] = 19, // Message Length: 19
      _bgp_msg_header[18] = 4, // Message Type: KEEPALIVE
      
      _bgp_keepalive_msg = _bgp_msg_header,

      new Message(new Data(_bgp_keepalive_msg))
    ))
  )))
  .merge('send', () => '', { maxIdle: '1m' })
  .replaceMessage(msg => new StreamEnd)

// BGP Notification Message Decoder

// Notification Message
// Notification messages are used to notify BGP peers of errors in a BGP process.

// Error code
// 1 octet
// Indicates an error type. The value 0 indicates a non-specific error type. For details about the error codes, see Table 9-8.

// Error subcode
// 1 octet
// Provides further information about the nature of a reported error.

// Data
// Variable
// Indicates the error data.

.pipeline('send')
  // .dump()
  .connect(config.bgp_addr)
  .dump()
  .deframe({
    'header': c => (
      ['marker', 15, [c]]
    ),

    'marker': marker => (
      [new MessageStart(), 'length', 2, []]
    ),

    'length': c => (
      _bgp_response_msg_length = c.reduce((a, b) => (b|0)+((a|0)<<1)),
      console.log(`message length: ${_bgp_response_msg_length}`),
      ['type', 1, []]
    ),

    'type': c => (
      _bgp_response_msg_type = c[0],
      console.log(`message type: ${_bgp_response_msg_type}`),

      // only decode notification message
      (_bgp_response_msg_type === CONSTANTS_BGP_MSG_TYPE_NOTIFICATION ? (
        ['error_code', 1, []]
      ) : (
        (_bgp_response_msg_type === CONSTANTS_BGP_MSG_TYPE_KEEPALIVE ? (
          // Keepalive message body is empty
          [new MessageEnd, 'header']
        ) : (
          ['data', _bgp_response_msg_length - 19, []]
        ))
      ))
    ),

    'error_code': c => (
      console.log(`error_code: ${c[0]}`),
      ['error_subcode', 1, []]
    ),

    'error_subcode': c => (
      console.log(`error_subcode: ${c[0]}`),
      // 21 octets = 19 octets (header) + 1 octet (error_code) + 1 octet (error_subcode)
      (_bgp_response_msg_length - 21 > 0 ? (        
        ['data', _bgp_response_msg_length - 21, []]
      ) : (
        [new MessageEnd, 'header']
      ))
    ),

    'data': data => (
      (_bgp_response_msg_type === CONSTANTS_BGP_MSG_TYPE_NOTIFICATION ? (
        console.log('data'),
        console.log(new Data(data).toString('utf8')),

        [new MessageEnd, 'header']
      ) : (
        [new MessageEnd, 'header']
      ))
    ),
  })

// // Register ip to loopback
// .task()
//   .exec(`ip addr add ${config.prefixes[0]} dev lo`)

// // TODO: Deregister ip from loopback
// .task('SIGINT')
//   .exec(`ip addr del ${config.prefixes[0]} dev lo`)

)(JSON.decode(pipy.load('../config/bgp-ipv4.json')))