#include <stdlib.h>
#include <ctype.h>
#include "pipy/nmi.h"
#include "libinjection/libinjection.h"
#include "libinjection/libinjection_sqli.h"

#ifdef __GNUC__
#  define UNUSED(x) UNUSED_ ## x __attribute__((__unused__))
#else
#  define UNUSED(x) UNUSED_ ## x
#endif

#define FINGERPRINT_SIZE 8

static void urldecode(char *dst, const char *src);

enum {
    id_var_is_sqli,
    id_var_is_xss,
    id_val_fingerprint,
};

typedef struct _pipeline_state {
  pjs_value start;
  pjs_value body;
  int sqli;
} pipeline_state;

static void pipeline_init(pipy_pipeline UNUSED(ppl), void **user_ptr) {
  *user_ptr = calloc(1, sizeof(pipeline_state));
}

static void pipeline_process(pipy_pipeline ppl, void *user_ptr, pjs_value evt) {
  pipeline_state *state = (pipeline_state *)user_ptr;
  if (pipy_is_MessageStart(evt)) {
    if (!state->start) {
      state->start = pjs_hold(evt);
      state->body = pjs_hold(pipy_Data_new(0, 0));

      pjs_value head = pipy_MessageStart_get_head(evt);
      pjs_value pjs_path = pjs_undefined();
      pjs_value v_path = pjs_string("path",-1);
      pjs_object_get_property(head, v_path, pjs_path);

      int size = pjs_string_get_length(pjs_path);
      char* path = (char*) malloc(size);
      pjs_string_get_utf8_data(pjs_path, path, size);
      char* location = (char*) malloc(size);
      urldecode(location, path);
      free(path);

      char fingerprint[FINGERPRINT_SIZE];
      int loc_size = strlen(location);
      state->sqli = libinjection_sqli(location, loc_size, fingerprint);
      int xss = libinjection_xss(location, loc_size);

      pipy_set_variable(ppl,id_var_is_sqli,pjs_boolean(state->sqli));
      pipy_set_variable(ppl,id_var_is_xss,pjs_boolean(xss));
      pipy_set_variable(ppl,id_val_fingerprint,pjs_string(fingerprint, FINGERPRINT_SIZE));

      free(location);
    }
  } else if (pipy_is_Data(evt)) {
    if ((state->start) && !(state->sqli)) {
      pipy_Data_push(state->body, evt);
    }
  } else if (pipy_is_MessageEnd(evt)) {
    if (state->start) {
      if (!state->sqli) {
        int size = pipy_Data_get_size(state->body) + 1;
        char buf[size];
        char fingerprint[FINGERPRINT_SIZE];
        pipy_Data_get_data(state->body, buf, size);

        state->sqli = libinjection_sqli(buf, size, fingerprint);
        int xss = libinjection_xss(buf, size);

        pipy_set_variable(ppl,id_var_is_sqli,pjs_boolean(state->sqli));
        pipy_set_variable(ppl,id_var_is_xss,pjs_boolean(xss));
        pipy_set_variable(ppl,id_val_fingerprint,pjs_string(fingerprint, FINGERPRINT_SIZE));
      }
      pjs_free(state->start);
      pjs_free(state->body);
    }
  }
  pipy_output_event(ppl, evt);
}

static void pipeline_free(pipy_pipeline UNUSED(ppl), void *user_ptr) {
  pipeline_state *state = (pipeline_state *)user_ptr;
  pjs_free(state->start);
  pjs_free(state->body);

  free(user_ptr);
}

void pipy_module_init() {
  pipy_define_variable(id_var_is_sqli, "__is_sqli", "lib-inject", pjs_boolean(0));
  pipy_define_variable(id_var_is_xss, "__is_xss", "lib-inject", pjs_boolean(0));
  pipy_define_variable(id_val_fingerprint, "__sqli_fingerprint", "lib-inject", pjs_undefined());
  pipy_define_pipeline("", pipeline_init, pipeline_free, pipeline_process);
}

static char normalize(char c) {
  if (c >= 'a')
    c -= 'a'-'A';
  if (c >= 'A')
    c -= ('A' - 10);
  else
    c -= '0';
  return c;
}
static void urldecode(char *dst, const char *src)
{
  char a, b;
  while (*src) {
    if ((*src == '%') &&
        ((a = src[1]) && (b = src[2])) &&
        (isxdigit(a) && isxdigit(b))) {
        a = normalize(a);
        b = normalize(b);
      *dst++ = 16*a+b;
      src+=3;
    } else if (*src == '+') {
      *dst++ = ' ';
      src++;
    } else {
      *dst++ = *src++;
    }
  }
  *dst++ = '\0';
}