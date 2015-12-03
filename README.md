# VSCode Language Server - Node

This repository contains the code for the following npm modules:

* _vscode-languageclient_: npm module to talk to a VSCode language server from a VSCode extension:<br>
[![NPM Version](https://img.shields.io/npm/v/vscode-languageclient.svg)](https://npmjs.org/package/vscode-languageclient)
[![NPM Downloads](https://img.shields.io/npm/dm/vscode-languageclient.svg)](https://npmjs.org/package/vscode-languageclient)
* _vscode-languageserver_: npm module to implement a VSCode language server using [Node.js](https://nodejs.org/) as a runtime:<br>
[![NPM Version](https://img.shields.io/npm/v/vscode-languageserver.svg)](https://npmjs.org/package/vscode-languageserver)
[![NPM Downloads](https://img.shields.io/npm/dm/vscode-languageserver.svg)](https://npmjs.org/package/vscode-languageserver)
* _vscode-jsonrpc_: the underlying message protocol to communicate between a client and a server:<br>
[![NPM Version](https://img.shields.io/npm/v/vscode-jsonrpc.svg)](https://npmjs.org/package/vscode-jsonrpc)
[![NPM Downloads](https://img.shields.io/npm/dm/vscode-jsonrpc.svg)](https://npmjs.org/package/vscode-jsonrpc)

All three npm modules are built using one travis build. Its status is:

[![Build Status](https://travis-ci.org/Microsoft/vscode-languageserver-node.svg?branch=master)](https://travis-ci.org/Microsoft/vscode-languageserver-node)

Click [here](https://code.visualstudio.com/docs/extensions/example-language-server) for a detaild document on how to uses these npm modules to implement 
language servers for [VSCode](https://code.visualstudio.com/).

## History

* 1.0.x: Current version which provides support for the following features:
  * Transports: stdio and node IPC can be used as a transport.
  * Document synchronization: incremental and full text document synchronization.
  * Configuration synchronization: synchronization of configuration settings to the server.
  * File events: synchronization of file events to the server.
  * Code Complete: provides code complete lists.
  * Document Highlights: highlights all 'equal' symbols in a text document.
  * Hover: provides hover information for a symbol selected in a text document.
  * Signature Help: provides signature help for a symbol selected in a text document.
  * Goto Definition: provides goto definition support for a symbol selected in a text document.
  * Find References: finds all project-wide references for a symbol selected in a text document.
  * List Document Symbols: lists all symbols defined in a text document.
  * List Workspace Symbols: lists all project-wide symbols.

* 0.10.x: Intial versions to build a good API for the client and server side

## License
[MIT](https://github.com/Microsoft/vscode-languageserver-node/blob/master/License.txt)