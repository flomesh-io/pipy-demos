# Securing services with OIDC and Pipy

This project demonstrates how to use [Pipy](https://github.com/flomesh-io/pipy) with [Keycloak](https://www.keycloak.org) to restrict access to the API services to only clients that present a valid OAuth 2 access token. Each token includes a scope field that's set with particular ROLE(s).

OpenID Connect (OIDC) is an authentication layer on top of OAuth2 authorization framework. This project places Pipy in-front of services to validate the JWT access token generated via Keycloak and implement access control based on user's roles to allow or deny access to underlying service resources.

## Setup

The provided `docker-compose.yaml` provision the following services:

* keycloak - the Identity and Access Management service, available at: http://keycloak.localtest.me:8080
* pipy-proxy - proxy that protects services, validate JWT access token generated via keycloak, perform token validation and user access control logic. available at : http://gateway.localtest.me:8000
* mock-services - Two mock services invididually listening on port 8081 and 8082, they are deployed internally and accessible only from pipy proxy and only by authorized users.

> Note: Above setup comes with pre-configured keycloak realm, users and specific roles.

To set up the demo project, initialize it with Docker Compose:
```sh
docker-compose up -d
```

> Note: Keycloak will take some time to load and start, so make sure you proceed with testing below after keycloak service is up and running.

## Testing

Project comes with 2 test users in Keycloak:

* `admin@example.com` - Sample Admin, has the following roles: `ADMIN` and `USER`
* `user@example.com` - Sample user, has one role: `USER`

Front-end pipy proxy is configured with following rules:

* all request starting with `/auth` will be be forwarded to keycloak
* `/user` service requires users to have `USER` role
* `/admin` service requires users to have `ADMIN` role
*  All other paths will return `404 No handler found`

### Scenarios

Use provided `gen_token.sh` to generate token from keycloak service via its REST API. script invoked with no argument will generate JWT token for `user` account. To generate token for `admin` pass the argument `admin` to script.

> Note: Script `gen_token.sh` assumes you have `jq` installed on your system. if you don't have it, make sure you update the script.


Let's test them.

#### user@example.com

```sh
$ export token=$(./gen_token.sh)
```

Above command will invoke script and connect to `http://gateway.localtest.me:8000/auth` and request JWT token for `user@example.com`. Assign keycloak returned JWT response `access_token` to our local variable `token`.

Now let's invoke our `/user` service endpoint.

```sh
$ curl http://gateway.localtest.me:8000/user -H "Authorization: Bearer $token"
User service called
```

This works as expected. Now use the same token to invoke `/admin` service endpoint and we should be rejected as `user@example.com` doesn't have `ADMIN` role and privileges.

```sh
$ curl http://gateway.localtest.me:8000/admin -H "Authorization: Bearer $token"
Forbidden: Access denied
```
This is working as expected.

#### admin@example.com

Now let's generate token for `admin@example.com` account and invoke both service endpoints to see if can access them.

```sh
$ export token=$(./gen_token.sh admin)
```

Now let's first call `/user` service and we should be allowed to access it, as `ADMIN` is both `USER` and `ADMIN`.

```sh
$ curl http://gateway.localtest.me:8000/user -H "Authorization: Bearer $token"
User service called
```

Now call `/admin` service endpoint:

```sh
$ curl http://gateway.localtest.me:8000/admin -H "Authorization: Bearer $token"
Admin service called
```

### Miscellaneous

* You can copy JWT access token and decode it on [https://jwt.io](https://jwt.io).

* You can verify the signature of the JWT token by providing the public key `keys/pubkey.pem` (available in `pipy-keycloak` folder). Public key can be also fetched from:
    ```
    curl http://keycloak.localtest.me:8080/auth/realms/master/
    ```
* Provided keycloak can be accessed via webconsole [http://keycloak.localtest.me:8080](http://keycloak.localtest.me:8080) and you can login via credentials `admin` and password `admin`.