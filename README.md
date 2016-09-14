# VSCode Language Server - Node

This repository contains the code for the following npm modules:

* _vscode-languageclient_: npm module to talk to a VSCode language server from a VSCode extension:<br>
[![NPM Version](https://img.shields.io/npm/v/vscode-languageclient.svg)](https://npmjs.org/package/vscode-languageclient)
[![NPM Downloads](https://img.shields.io/npm/dm/vscode-languageclient.svg)](https://npmjs.org/package/vscode-languageclient)
* _vscode-languageserver_: npm module to implement a VSCode language server using [Node.js](https://nodejs.org/) as a runtime:<br>
[![NPM Version](https://img.shields.io/npm/v/vscode-languageserver.svg)](https://npmjs.org/package/vscode-languageserver)
[![NPM Downloads](https://img.shields.io/npm/dm/vscode-languageserver.svg)](https://npmjs.org/package/vscode-languageserver)
* _vscode-languageserver-types_: data types used by the language server client and server:<br>
[![NPM Version](https://img.shields.io/npm/v/vscode-languageserver-types.svg)](https://npmjs.org/package/vscode-languageserver-types)
[![NPM Downloads](https://img.shields.io/npm/dm/vscode-languageserver-types.svg)](https://npmjs.org/package/vscode-languageserver-types)
* _vscode-jsonrpc_: the underlying message protocol to communicate between a client and a server:<br>
[![NPM Version](https://img.shields.io/npm/v/vscode-jsonrpc.svg)](https://npmjs.org/package/vscode-jsonrpc)
[![NPM Downloads](https://img.shields.io/npm/dm/vscode-jsonrpc.svg)](https://npmjs.org/package/vscode-jsonrpc)

All four npm modules are built using one travis build. Its status is:

[![Build Status](https://travis-ci.org/Microsoft/vscode-languageserver-node.svg?branch=master)](https://travis-ci.org/Microsoft/vscode-languageserver-node)

Click [here](https://code.visualstudio.com/docs/extensions/example-language-server) for a detailed document on how to use these npm modules to implement 
language servers for [VSCode](https://code.visualstudio.com/).

## History

* Next: Client and Server
  * Support for Document Link Providers

* 2.5.0: Client and Server
  * Better error handling on client side.
  * Events for starting and stopping the server.
  * Initialization options can be provided as a function.
  * Support for stdio / stderr encoding.
  * Support to convert URIs betweeen the client and the server.
  * Server connection.console logging now appears in the corresponding output channel instead of in the developer console.
  * If a non stdio communicaiton channel is used between client and server the server's stdio is redirected to the output channel.
  * A client can now have an id and a name.

* 2.4.0 Client and Server
  * Data types such as Range, Position, TextDocument, Hover, CompletionItem... extracted to new node module _vscode-languageserver-types_.
  The new node module is shared between the server and client and can also be used by language service libraries that want to use the same data types.

* 2.3.0: Client only
  * the client now restarts the server if the server crashes without a prior exit notification sent. The strategy used to restart
  the server is pluggable (see `LanguageClientOptions.errorHandler`). The default strategy restart the server unless it crashed 5
  times or more in the last 3 minutes. 

* 2.0: A detailed desciption of the 2.0 version can be found [here](https://github.com/Microsoft/vscode-languageserver-protocol/blob/master/README.md). A summary of the changes:
  * support for request cancellation. Cancellation is automatically hooked to VSCode's cancellation tokens
  * document save notification.
  * Synced text documents carry VSCode's text document version number

* 1.1.x: Provides all language service feature available in the extension host via the language client / server protocol. Features added:
  * Code Actions: provide actions to fix diagnostic problems.
  * Code Lens: provide commands that are shown along with source text.
  * Formatting: whole document, document ranges and formatting on type.
  * Rename refactoring: provides renaming symbols.

* 1.0.x: Version which provides support for the following features:
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
