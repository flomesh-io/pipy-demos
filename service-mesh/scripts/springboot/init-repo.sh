#!/usr/bin/env bash

set -exu
#### local repo
REPO_HOST=localhost:30060
REPO_NAME=springboot

# check pipy repo running
until curl -sf http://$REPO_HOST/repo;
  do echo "waiting pipy repo up";
  sleep 2;
done;

# create repo
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME
#main
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/main.js --data-binary '@./main.js'
# plugins
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/header-injection.js --data-binary '@./plugins/header-injection.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/router.js --data-binary '@./plugins/router.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/balancer.js --data-binary '@./plugins/balancer.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/eureka.js --data-binary '@./plugins/eureka.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/default.js --data-binary '@./plugins/default.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/logger.js --data-binary '@./plugins/logger.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/inbound/inbound.js --data-binary '@./plugins/inbound/inbound.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/inbound/throttle.js --data-binary '@./plugins/inbound/throttle.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/inbound/ban.js --data-binary '@./plugins/inbound/ban.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/inbound/circuit-breaker.js --data-binary '@./plugins/inbound/circuit-breaker.js'
# config
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/main.json --data-binary '@./config/main.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/router.json --data-binary '@./config/router.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/balancer.json --data-binary '@./config/balancer.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/inbound/throttle.json --data-binary '@./config/inbound/throttle.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/inbound/ban.json --data-binary '@./config/inbound/ban.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/logger.json --data-binary '@./config/logger.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/inbound/circuit-breaker.json --data-binary '@./config/inbound/circuit-breaker.json'
# release
version=(`curl -s http://$REPO_HOST/api/v1/repo/$REPO_NAME | jq -r .version`) || 1
version=$(( version+1 ))
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME --data '{"version": '$version'}'

baseReq='{"version":'$version',"base":"/springboot"}'

curl -X POST http://$REPO_HOST/api/v1/repo/samples-bookinfo-reviews --data $baseReq
curl -X POST http://$REPO_HOST/api/v1/repo/samples-bookinfo-ratings --data $baseReq
curl -X POST http://$REPO_HOST/api/v1/repo/samples-bookinfo-details --data $baseReq
curl -X POST http://$REPO_HOST/api/v1/repo/samples-api-gateway --data $baseReq