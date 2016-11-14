#!/bin/sh -x

echo "upstream - init - adding as remote"
git remote add upstream git@github.com:Microsoft/vscode-languageserver-node.git
git remote --v