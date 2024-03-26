# Pipy MQTT Proxy

## Intro

This is a demonstration of Pipy working as a MQTT Proxy, providing features:

- Loadbalancing
- Message tagging
- Logging
- Metrics
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

- `listen`: the port proxy will listen on
- `brokers`: the list of upstream MQTT brokers
- `limits`: rate limit configuration which can limit connection rate and message publising rate
- `tags`: the tags list you prefer to embed in message header
- `ids`: the client id white and black list
- `creds`: username and password
- `plugins`: the feature list proxy provides. You can customize its features by commenting or uncommenting. 
But please keep the `balancer` in the end.

```yaml
listen: 1884
brokers:
  - localhost:1883
limits:
  conn:
    rate: 20
    blockInput: true
  pub:
    rate: 20
    blockInput: true
tags:
  proxy: pipy
ids:
  allow:
    - client-1
    - client-2
  deny:
    - client-3
creds:
  flomesh: pipy  
plugins:
  - tag
  - logger
  - metrics
  # - identify
  # - credential
  - throttle
  - balancer
```
