#!/bin/sh -x

set -e errexit
set -o pipefail

# build all the packages, IN ORDER, then link them.
# excluded the client.tests for now.
PACKAGES="types jsonrpc client server"

for PACKAGE in $PACKAGES
do
	echo "BUILDING: ${PACKAGE}"
	(cd $PACKAGE && \
		npm cache clean && \
		yarn install && \
		(yarn unlink || yarn link))
done