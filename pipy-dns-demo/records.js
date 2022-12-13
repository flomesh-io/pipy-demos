(
  (
    config = JSON.decode(pipy.load('records.json')),
    dns,
    global = {}
  ) => (

    dns = {
      code: {
        // DNS Query completed successfully
        'NOErecordOR': 0,
        // DNS Query Format Erecordor
        'FORMErecord': 1,
        // Server failed to complete the DNS request
        'SERVFAIL': 2,
        // Domain name does not exist.  
        'NXDOMAIN': 3,
        // Function not implemented
        'NOTIMP': 4,
        // The server refused to answer for the query
        'REFUSED': 5,
        // Name that should not exist, does exist
        'YXDOMAIN': 6,
        // recordset that should not exist, does exist
        'XrecordSET': 7,
        // Server not authoritative for the zone
        'NOTAUTH': 8,
        // Name not in zone
        'NOTZONE': 9
      },
      name_type_record: {}
    },

    dns.normalize_ipv6 = (ipv6) => (
      ((vec, str = '', len = 5, total = 0) => (
        vec = ipv6.split(':'),
        vec.map(e => (
          (str.length > 0 || len != 5) && (str += ':'),
          len = 4 - e.length,
          (len <= 0) && (
            str += e
          ),
          (len === 1) && (
            str += '0' + e
          ),
          (len === 2) && (
            str += '00' + e
          ),
          (len === 3) && (
            str += '000' + e
          ),
          (len < 4) && (
            total += 4
          )
        )),
        str.indexOf('::') < 0 ? str : (
          32 - total > 4 ? dns.normalize_ipv6(str.replace('::', ':0000::')) : (
            32 - total > 0 ? str.replace('::', ':0000:') : str
          )
        )
      ))()
    ),

    dns.load_data = () => (
      (key => (
        config.map(
          record => (
            key = null,
            record?.name && record?.type && (
              key = (record.name + '#' + record.type).toUpperCase(),
              (record?.status === 'deny') && (
                dns.name_type_record[key] = {
                  'status': 'deny'
                }
              ) || (
                !Boolean(dns.name_type_record[key]) && (
                  dns.name_type_record[key] = {
                    rr: []
                  }
                ),
                (record.type === 'AAAA') && record?.rdata && (
                  record.rdata = dns.normalize_ipv6(record.rdata).replaceAll(':', '')
                ),
                dns.name_type_record[key].rr.push(record)
              )
            )
          )
        )
      ))()
    ),

    dns.suffix_match = (name, type) => (
      name && type && ((key, vec, index, record = null) => (
        key = (name + '#' + type).toUpperCase(),
        record = dns.name_type_record[key],
        !Boolean(record) && (
          vec = name.split('.'),
          key = '',
          index = 0,
          vec.map(e => (
            index++ > 0 && (
              key.length > 0 && (key += '.'),
              key += e
            )
          )),
          record = dns.suffix_match(key, type)
        ),
        record
      ))()
    ),

    dns.query = (name, type) => dns.name_type_record[(name + '#' + type).toUpperCase()],

    dns.load_data(),

    global.local = dns,

    global
  )

)()