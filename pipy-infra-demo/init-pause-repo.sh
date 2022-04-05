#!/usr/bin/env bash

set -exu
#### local repo
REPO_HOST=localhost:6060
REPO_NAME=pause
REPO_HOST=ch.demo.flomesh.cn:6061
#### remote repo
# REPO_HOST=hub.flomesh.cn:6060
# REPO_NAME=pod/$1


#create repo
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME
#main
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/main.js --data-binary '@./docker/scripts/pause.js'

#release
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME --data '{"version": 2}'