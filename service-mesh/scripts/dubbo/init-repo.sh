#!/usr/bin/env bash

set -exu
#### local repo
REPO_HOST=192.168.1.5:30060
REPO_NAME=dubbo

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
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/router.js --data-binary '@./plugins/router.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/forward.js --data-binary '@./plugins/forward.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/metric.js --data-binary '@./plugins/metric.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/logger.js --data-binary '@./plugins/logger.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/circuit-breaker.js --data-binary '@./plugins/circuit-breaker.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/inbound/inbound.js --data-binary '@./plugins/inbound/inbound.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/inbound/throttle.js --data-binary '@./plugins/inbound/throttle.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/inbound/ban.js --data-binary '@./plugins/inbound/ban.js'
# config
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/main.json --data-binary '@./config/main.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/inbound/throttle.json --data-binary '@./config/inbound/throttle.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/inbound/ban.json --data-binary '@./config/inbound/ban.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/logger.json --data-binary '@./config/logger.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/circuit-breaker.json --data-binary '@./config/circuit-breaker.json'
# task
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/tasks/status.js --data-binary '@./tasks/status.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/tasks/heartbeat.js --data-binary '@./tasks/heartbeat.js'
# release
version=(`curl -s http://$REPO_HOST/api/v1/repo/$REPO_NAME | jq -r .version`) || 1
version=$(( version+1 ))
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME --data '{"version": '$version'}'

baseReq='{"version":'$version',"base":"/dubbo"}'

curl -X POST http://$REPO_HOST/api/v1/repo/consumer-service --data $baseReq
curl -X POST http://$REPO_HOST/api/v1/repo/hello-service --data $baseReq
curl -X POST http://$REPO_HOST/api/v1/repo/date-service --data $baseReq
curl -X POST http://$REPO_HOST/api/v1/repo/time-service --data $baseReq