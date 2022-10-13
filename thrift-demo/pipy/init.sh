#!/bin/sh

# set -ex

DIR=${1:-.}
REPO_NAME=${2:-test}
REPO_HOST=${3:-localhost:6060}
# create repo
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME

find $DIR -type f | cut -c3- | while read line;
do
  curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME/$line --data-binary "@./$line"
done;

# release
curl -X POST http://$REPO_HOST/api/v1/repo/$REPO_NAME --data '{"version": '$(date +%s)'}'