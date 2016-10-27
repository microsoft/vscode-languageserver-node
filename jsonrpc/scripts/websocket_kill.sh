#!/bin/sh -x

pgrep -f "websocket-" | xargs kill
