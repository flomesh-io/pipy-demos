#!/usr/bin/env bash

set -e

user=${1:-"user"}
realm=${2:-"pipy-realm"}

curl -s http://gateway.localtest.me:8000/auth/realms/$realm/protocol/openid-connect/token \
-H 'Content-Type: application/x-www-form-urlencoded' \
-d 'username='$user'@example.com' \
-d 'password=passw0rd' \
-d 'grant_type=password' \
-d 'client_id=pipy-oidc-proxy' \
-d 'client_secret=0OT8IZOqjhw0UWt5qheymCoJAbPhkOsK' | jq -r '.access_token'
