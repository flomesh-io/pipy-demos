PRODUCT = bin/inject-nmi.so
OS = $(shell uname -s)

CFLAGS=-Wall -Wextra -Werror -ansi -g -O3 -fPIC
LDFLAGS=-shared
ifeq (${OS},Darwin)
  LDFLAGS += -Wl,-flat_namespace,-undefined,dynamic_lookup
endif

DEPS=libinjection/libinjection_sqli.c \
	libinjection/libinjection_html5.c \
	libinjection/libinjection_xss.c


all: output ${PRODUCT}

${PRODUCT}: libinject-module.c
	clang ${CFLAGS} -I. ${LDFLAGS} $< ${DEPS} -o $@

output:
	@mkdir -p bin
clean:
	@rm -rf bin

test:
	${BIN_DIR}/pipy main.js
