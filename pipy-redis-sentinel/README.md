# Setup a highly-available Redis with Sentinel and Pipy

The purpose of this tutorial is to show you how to quickly setup a highly-available Redis cluster with Sentinel (comes with Redis) and Pipy. We will also configure our Pipy proxy to forward all `SET` requests to Redis Master node, as Redis Slave nodes cannot handle `SET`.

For demonstration purposes, this demo comes with Docker Compose script to spin up following containers: 

* [Redis](https://redis.io/) which is a popular open source in-memory database. Demo create 1 master & 2 slave containers.
* [Redis Sentinel](https://redis.io/docs/manual/sentinel/) which is used to provide HA and clustering for Redis. Demo create 3 sentinel containers.
* [Pipy](http://flomesh.io) which will be used as a TCP load balancer for the Redis nodes. As well as ensure that all `SET` commands are forwarded to Redis master node.


### Prerequisites

* [Docker](https://www.docker.com)
* [docker-compose](https://docs.docker.com/compose/install)
* [redis-cli](https://redis.io/topics/rediscli)

### Setup

1. Clone this repo

```sh
$ git clone https://github.com/flomesh-io/pipy-demos/redis-sentinel.git
```

2. Spin up Pipy proxy, Redis, Sentinel containers

```sh
$ docker-compose up -d
```

### Testing

1. Make sure all containers are up and running:

```sh
$ docker ps

CONTAINER ID   IMAGE                       COMMAND                  CREATED         STATUS         PORTS                                                 NAMES
0db7eba4f91d   sentinel                    "sentinel-entrypoint…"   6 seconds ago   Up 6 seconds   6379/tcp, 26379/tcp                                   redis_sentinel_3
e4a7b6b99074   sentinel                    "sentinel-entrypoint…"   6 seconds ago   Up 6 seconds   6379/tcp, 26379/tcp                                   redis_sentinel_2
4ec87846b1e3   naqvis/pipy-pjs:0.22.0-31   "/docker-entrypoint.…"   6 seconds ago   Up 5 seconds   6000/tcp, 0.0.0.0:6379->6379/tcp, :::6379->6379/tcp   pipy-proxy
8e81ddc5eb07   sentinel                    "sentinel-entrypoint…"   6 seconds ago   Up 4 seconds   6379/tcp, 26379/tcp                                   redis_sentinel_1
f1a533de6d41   redis:alpine                "docker-entrypoint.s…"   8 seconds ago   Up 6 seconds   6379/tcp                                              redis-slave2
a522c208b236   redis:alpine                "docker-entrypoint.s…"   8 seconds ago   Up 7 seconds   6379/tcp                                              redis-slave1
8065dec93c3d   redis:alpine                "docker-entrypoint.s…"   8 seconds ago   Up 7 seconds   6379/tcp                                              redis-master
```

Pipy is listening on TCP port **6379** on the docker host which is the standard Redis port and load balance across the 3 Redis containers (one Master & two Slave). Three Redis Sentinel contaners for a robust deployment and providing high availability for Redis.

2. Check that Pipy service is routing traffic to all Redis nodes by executing below commands. You don't need to provide docker host IP and port information, as Pipy is exposing Redis default port of 6379.

```sh
$ redis-cli info replication | grep role
role:master
$ redis-cli info replication | grep role
role:slave
$ redis-cli info replication | grep role
role:slave
```

Pipy comes with load balancing algorithms and demo script is configured to use [RoundRobinLoadBalancer](https://flomesh.io/docs/en/reference/api/algo/RoundRobinLoadBalancer) and you can see from above output that Pipy is sending requests to all configured Redis nodes in roundrobin fashion.

3. Now try some more Redis commands

```sh
$ redis-cli set hello world
OK

$ redis-cli get hello
"world"

$ redis-cli set foo bar
OK
```

We have configured proxy to use roundrobin algorithms, but we have seen that all `SET` requests are executed successfully. If we have simply followed the roundrobin algorithm to forward requests equally to each nodes, then our `SET` requests reaching out to slave nodes would have failed with error like:
```
(error) READONLY You can't write against a read only slave.
```

### Failover Testing

4. Let's **pause** `redis-master` container to test failover

```sh
$ docker pause redis-master
```

Once we pause `redis-master` container, Sentinel will automatically detect that the master is missing, and it will choose a slave to promote that as **master**. Pipy during health-checks will detect that master node is down, it will mark that as unhealthy and will no longer send requests to that node until node become accessible again. Pipy will detect new master node and will forward all `SET` commands to newly promoted `master node`.

5. Run again some Redis commands to see if can access Redis without any problems.

```sh
$ redis-cli set abc 1234
OK

$ redis-cli get abc
"1234"
```

6. Bring back pause container, and Sentinel will mark that as slave node

```sh
$ docker unpause redis-master

```

That's it, You should now have everything You need to setup a well functioning and high available Redis cluster.
