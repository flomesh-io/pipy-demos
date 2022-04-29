#!/bin/sh

set -eu

npm run build && rsync -av --delete public ../static-site