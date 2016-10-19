#!/bin/sh -x

npm install npm-link-local -g

(cd vscode-jsonrpc && npm install)
(cd vscode-languageserver-types && npm install)

(cd vscode-languageserver && \
npm-link-local ../vscode-jsonrpc && \
npm-link-local ../vscode-languageserver-types && \
npm install)

(cd vscode-languageclient && \
npm-link-local ../vscode-jsonrpc && \
npm-link-local ../vscode-languageserver-types && \
npm install)

(cd vscode-languageclient-test && \
npm-link-local ../vscode-languageserver-types && \
npm install)
