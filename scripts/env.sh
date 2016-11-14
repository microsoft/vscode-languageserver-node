#!/bin/sh -x

# set the env for the shell. `bower` below is installed in the node_modules folder.
# example use:
#
# $ . ./scripts/env.sh
# $ bower

BIN_YARN=`yarn bin`
BIN_YARN_GLOBAL=`yarn global bin`
export PATH="$BIN_YARN:$BIN_YARN_GLOBAL:$PATH"