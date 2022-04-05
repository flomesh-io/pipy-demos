**Table of Contents**
* [1. Build pipy infra image](#1-build-pipy-infra-image)
* [2. Create K3s Cluster](#2-create-k3s-cluster)
  * [2.1. k3s on host](#21-k3s-on-host)
  * [2.2. k3s in docker via k3d](#22-k3s-in-docker-via-k3d)
* [3. Setup Environment](#3-setup-environment)
  * [3.1. Pipy repo controller](#31-pipy-repo-controller)
  * [3.2. SpringCloud elements](#32-springcloud-elements)
* [4. Run demo apps](#4-run-demo-apps)
  * [4.1. SpringBoot app](#41-springboot-app)
  * [4.2. Non-Java app](#42-non-java-app)
* [5. Test](#5-test)

## 1. Build pipy infra image

```shell
TAG=0.4.0-224
docker build -t docker.io/flomesh/pipy-node:$TAG ./docker
docker push docker.io/flomesh/pipy-node:$TAG
```

## 2. Create K3s Cluster

### 2.1. k3s on host

Use two steps to install k3s. First install k3s binary and tools without starting server.

```shell
curl -sfL https://get.k3s.io | INSTALL_K3S_SKIP_START=true INSTALL_K3S_SKIP_ENABLE=true sh - 
```

Then start k3s server with specified paruse image. k3s built in container runtime _containerd_ is not friendly for developing and debugging. 

*For develop mode, you can append `--docker` option to take _docker_ a container runtime.*

The latest tag of pipy infra image is `0.4.0-224`.

```shell
k3s server --pause-image="flomesh/pipy-node:0.4.0-224"
```

At last, change the mode of `/etc/rancher/k3s/k3s.yaml` and then you can any account other than _root_.

```shell
sudo chmod 644 /etc/rancher/k3s/k3s.yaml
```

### 2.2. k3s in docker via k3d

```shell
k3d cluster create infra-test --k3s-arg "--pause-image=flomesh/pipy-node:0.4.0-224"@
```

## 3. Setup Environment

### 3.1. Pipy repo controller

First, deploy certificate manger:

```shell
kubectl apply -f kubernetes/artifacts/cert-manager-v1.5.3.yaml
```

Confirm all pods up:

```shell
kubectl get pod -n cert-manager
NAME                                       READY   STATUS    RESTARTS   AGE
cert-manager-cainjector-57c4d88795-k5nxm   1/1     Running   0          1m
cert-manager-5cf47d87cd-scgt9              1/1     Running   0          1m
cert-manager-webhook-5fdc55c65b-5qxhs      1/1     Running   0          1m
```

Deploy repo controller:

```shell
kubectl apply -f kubernetes/artifacts/pipy-infra.yaml
```

Make sure all pods up as well:

```shell
kubectl get pod -n pipy-infra
NAME                                       READY   STATUS    RESTARTS   AGE
controller-manager-pifr-7787f9fc84-lhmb5   2/2     Running   0          1m
```

### 3.2. SpringCloud elements

1. Setup eureka server as discovery service by executing `kubectl apply -f kubernetes/discovery.yaml`, then wait container up.
2. Execute `kubectl apply -f kubernetes/config.yaml` and wait container up. Note: config service is only required by the springboot app in this example.
3. Go to [test part](./README.md#TEST), follow steps and you will get "CONFIG-SERVICE" only in output.

## 4. Run demo apps

Due to infra container requiring to be aware of the REAL service name to register it in Eureka, we inject an environment carring the service name.

For app healthching, infra container will take `httpGet` part of readiness probe as healthcheck endopoint.

### 4.1. SpringBoot app

Execute `kubectl apply -f kubernetes/springboot/deployment.yaml`.

### 4.2. Non-Java app

We use pipy to run a static server as a non-java app. You can use any other types, such as Python, Nodejs etc.

Execute `kubectl apply -f kubernetes/http-static-server/deployment.yaml`.

## 5. Test

Check the instance registerd in eureka server by shell into discovery pod:

```shell
kubectl exec -it samples-discovery-server-6d67944757-4nrvv -- sh
apk add curl jq
curl -s localhost:8761/eureka/apps -H accept:application/json | jq -r .applications.application[].name
```

If all working fine, you will get:

```
CONFIG-SERVICE
BOOKINFO-RATINGS
```
