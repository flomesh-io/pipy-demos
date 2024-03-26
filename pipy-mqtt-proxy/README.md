# Pipy MQTT Proxy

## Intro

This is a demonstration of Pipy working as a MQTT Proxy, providing features:

- Loadbalancing
- Message tagging
- Logging
- Metrics
- Tracing
- Rate limit
- Client identifier black/white list
- Authentication base on username and password

Beyond these, it also provides flexible extension with [PipyJS](https://flomesh.io/pipy/docs/en/reference/pjs).

## Quickstart

First, download the Pipy binary from [here](https://flomesh.io/pipy/download).

Then run the command:

```shell
pipy main.js
```

It will start a proxy listening on `1884` and forward the request to broker which may running on `localhost:1883`.

## Configuration

The configuration of proxy locates at [config.yaml](./config.yaml).

- `listen`: the port proxy will listen on,
- `listenTLS`
  - `port`: the TLS port proxy will listen on. Disable TSL by commentting.
  - `cert`: cert file location
  - `key`: key file location
- `brokers`: the list of upstream MQTT brokers,
- `limits`: rate limit configuration which can limit connection rate and message publising rate,
- `tracing`: proxy will generate a traceid and embed it header with name as value of `key`,
- `tags`: the tags list you prefer to embed in message header. It accepts key-value pair.
- `ids`: the client id white and black list,
- `creds`: username and password configured as key-value pair.
- `plugins`: the feature list proxy provides. You can customize its features by commenting or uncommenting.
 But please keep the `balancer` in the end.

```yaml
listen: 1884
listenTLS: 
  port: 11884
  cert: ./secret/server-cert.pem
  key: ./secret/server-key.pem
brokers:
  - localhost:1883
limits:
  conn:
    rate: 20
    blockInput: true
  pub:
    rate: 20
    blockInput: true
tracing:
  key: traceid
tags:
  proxy: pipy
ids:
  allow:
    - client-1
    - client-2
  deny:
    - client-3
creds:
  username: flomesh
  password: pipy  
plugins:
  - tag
  - tracing
  - logger
  - metrics
  # - identify
  # - credential
  - throttle
  - balancer
```

## Appendix

The cert and key files in [./secret](./secret) are generated with script below.

```shell
#ca
openssl genrsa 2048 > ca-key.pem
openssl req -new -x509 -nodes -days 365000 \
   -key ca-key.pem \
   -out ca-cert.pem \
   -subj '/CN=nip.io'
#sever
openssl genrsa -out server-key.pem 2048
openssl req -new -key server-key.pem -out server.csr -subj '/CN=broker.nip.io'
openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem -days 365
#client
openssl genrsa -out client-key.pem 2048
openssl req -new -key client-key.pem -out client.csr -subj '/CN=client.nip.io'
openssl x509 -req -in client.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out client-cert.pem -days 365
```
