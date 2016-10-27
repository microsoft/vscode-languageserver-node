#!/bin/sh -x

DEBUG=* node ./lib/samples/websocket-server &
DEBUG=* node ./lib/samples/websocket-client &
