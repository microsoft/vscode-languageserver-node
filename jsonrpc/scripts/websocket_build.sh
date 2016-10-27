#!/bin/sh -x

npm install
./scripts/websocket_kill.sh
./scripts/websocket_start.sh

