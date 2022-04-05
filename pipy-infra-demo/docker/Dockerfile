FROM flomesh/pipy-pjs:0.4.0-224
LABEL maintainer="Kevein Liu<kevein@flomesh.cn>"

ARG RELEASE_VERSION
ENV RELEASE_VERSION=${RELEASE_VERSION:-0.4.0}

ARG REVISION
ENV REVISION=${REVISION:-1}

COPY scripts /scripts

ENTRYPOINT hostname | grep controller-manager- && pipy scripts/pause.js || pipy http://pipy-repo-service-pifr.pipy-infra.svc:6060/repo/pod/`hostname`/ --admin-port=6062

STOPSIGNAL SIGTERM
