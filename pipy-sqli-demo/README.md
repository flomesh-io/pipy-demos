# Pipy Native Module Interface (NMI) Demo

This demo demonstrates how to use Pipy NMI to develop a Pipy Module which can be used in your Pipy PJS as pipeline to block SQL Injection and Cross Site Scripting (XSS) attacks.

> Refer to [Flomesh Blog](https://blog.flomesh.io) for detailed article and step-by-step tutorial.

## Included Folders

* inject-nmi
  * Folder containing the C source code of Pipy Native Module and its dependency [libinjection](https://github.com/libinjection/libinjection). Use `make` to compile.
* k8s
  * Folder containing the Kubernetes manifests for demo application.