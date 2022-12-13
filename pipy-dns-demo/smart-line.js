(
  (
    config = JSON.decode(pipy.load('smart-line.json')),
    lines = Object.fromEntries(
      Object.entries(config).map(
        ([line, ranges]) => [
          line,
          ranges.map(range => new Netmask(range))
        ]
      )
    ),
    global = {},
  ) => (
    global.filter = (ip, record) => (
      ((line) => (
        line = Object.entries(lines).find(
          ([line, ranges]) => ranges.find(range => range.contains(ip))
        )?.[0],
        line ? (
          {
            rr: record.rr.filter(rec => !Boolean(rec?.labels) || Boolean(rec.labels.find(label => label == line)))
          }
        ) : record
      ))()
    ),
    global
  )

)()