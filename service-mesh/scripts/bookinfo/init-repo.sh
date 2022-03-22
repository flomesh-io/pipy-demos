#!/usr/bin/env bash

set -exu
#### local repo
REPO_HOST=localhost:30060
REPO_NAME=bookinfo

version=`curl -s http://$REPO_HOST/api/v1/repo/springboot | jq -r .version`
version=$(( version+1 ))
# create repo
# curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME --data '{"version":'$version',"base":"/springboot"}'
#main
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/main.js --data-binary '@./main.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/router.js --data-binary '@./plugins/router.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/registry.js --data-binary '@./plugins/registry.js'

# config
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/router.json --data-binary '@./config/router.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/registry.json --data-binary '@./config/registry.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/inbound/throttle.json --data-binary '@./config/inbound/throttle.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/inbound/ban.json --data-binary '@./config/inbound/ban.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/inbound/circuit-breaker.json --data-binary '@./config/inbound/circuit-breaker.json'
# release
baseReq='{"version":'$version',"base":"/bookinfo"}'

curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME --data '{"version": '$version'}'

curl -X POST http://$REPO_HOST/api/v1/repo/productpage --data $baseReq
curl -X POST http://$REPO_HOST/api/v1/repo/details --data $baseReq
curl -X POST http://$REPO_HOST/api/v1/repo/reviews --data $baseReq
curl -X POST http://$REPO_HOST/api/v1/repo/ratings --data $baseReq