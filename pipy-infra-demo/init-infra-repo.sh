#!/usr/bin/env bash

set -exu
#### local repo
REPO_HOST=localhost:6060
REPO_NAME=pipy-infra

version=`curl -s http://$REPO_HOST/api/v1/repo/$REPO_NAME | jq -r .version`
version=$(( version+1 ))

#create repo
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME
#main
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/main.js --data-binary '@./scripts/main.js'
#config
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/eureka.json --data-binary '@./scripts/config/eureka.json'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/config/main.json --data-binary '@./scripts/config/main.json'
#plugins
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/log.js --data-binary '@./scripts/plugins/log.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/registry.js --data-binary '@./scripts/plugins/registry.js'
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/plugins/proxy.js --data-binary '@./scripts/plugins/proxy.js'

#release
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME --data '{"version": '$version'}'
