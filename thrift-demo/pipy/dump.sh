#!/bin/sh

# set -ex

mkdir -p $1 $1/config $1/plugins 2>&1 > /dev/null || true

curl -s $2 | while read line;
do
  curl -so $1/${line:1} $2${line:1}
done