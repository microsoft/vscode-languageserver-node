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

### 3.0.5 Server and 3.0.4 Client

* deprecated `Files.uriToFilePath` in favour of the vscode-uri npm module which provides a more complete implementation of URI for VS Code.
* made `rootPath` optional since it is deprecated in 3.x. 

### 3.0.3: Client, Server and JSON-RPC

#### New Features

* Moved all libraries to TypeScript 2.x.x
* Client and Server are compiled to ES6. JSON-RPC is still compiled to ES5.
* JSON-RPC supports n parameter request and notification invocation.
* Support for the 3.0 version of the [Language Server protocol](https://github.com/Microsoft/language-server-protocol). Some highlights are:
  * Support for feature flags.
  * Support for dynamic registration. In the 2.x version of the library a server announced its capabilities statically. In 3.x the server
    can now dynamically register and unregister capability handlers using the new requests `client/registerCapability` and `client/unregisterCapability`.
  * Support to delegate command execution via a new request `workspace/executeCommand` to the server.
* Support for snippets in completion items:
  * New type `InsertTextFormat`
  * CompletionItem.insertTextFormat controls whether the inserted test is interpreted as a plain text or a snippet.

#### Breaking changes:
* to ensure ordered delivery of notifications and requests the language client now throws if sendRequest, onRequest, sendNotification or onNotification is called before the client is ready. Use the onReady() Promise to wait until the client is ready.

```ts
let client = new LanguageClient(...);
client.onReady().then(() => {
  client.onNotification(...);
  client.sendRequest(...);
);
```
* removed the deprecated module functions on code2Protocol and protocol2Code converters. Use the corresponding properties on the LanguageClient instance instead to get access to the same converters used by the LanguageClient.

```ts
// Old
import { Protocol2Code, ... } from 'vscode-languageclient';
Protocol2Code.asTextEdits(edits);
// New
let client = new LanguageClient(...);
client.protocol2CodeConverter.asTextEdits(edits);
```
* due to the use of TypeScript 2.x.x and differences in d.ts generation users of the new version need to move to TypeScript 2.x.x as well. Usually the `LanguageClient` is used in a VS Code extension. You can find detailed steps on how to upgrade a VS Code extension to TypeScript 2.x.x [here](http://code.visualstudio.com/updates/v1_6#_authoring-in-typescript).
* `activeSignature` and `activeParameter` where incorrectly declared as optional in `SignatureHelp`. They are now mandatory.
* the `protocol.ts` file used enum types in 2.x. However the protocol itself is number based since no assumption can be made about the presence of an enum type  in the implementing language. To make this more clear the enum got replace by number types with a or literal type definition. This might result in compile errors if a number was directly assigned to a previous enum type without a proper range check.
* Request and Notification types are now classes instead of interfaces. In addition they now take an additional type argument to type the registration options for dynamic registration. Adopting to that change is quite easy. Simply new the `RequestType` or `NotificationType` and add void as the registration option type. Please remember to update this on both the client and server side:

```ts
// Old
export namespace MyRequest {
  export const type: RequestType<MyParams, MyResult, void> = { get method() { return 'myRequest'; } };
}
export namespace MyNotification {
  export const type: NotificationType<MyParams> = { get method() { return 'myNotification'; } };
}
// New
export namespace MyRequest {
  export const type = new RequestType<MyParams, MyResult, void, void>('myRequest');
}
export namespace MyNotification {
  export const type = new NotificationType<MyParams, void>('myNotification');
}
```

### 2.6.0: Client and server

* Support for Document Link Providers
* Support for additional text edits and commands in completion items.

### 2.5.0: Client and Server

* Better error handling on client side.
* Events for starting and stopping the server.
* Initialization options can be provided as a function.
* Support for stdio / stderr encoding.
* Support to convert URIs betweeen the client and the server.
* Server connection.console logging now appears in the corresponding output channel instead of in the developer console.
* If a non stdio communication channel is used between client and server the server's stdio is redirected to the output channel.
* A client can now have an id and a name.

### 2.4.0 Client and Server

* Data types such as Range, Position, TextDocument, Hover, CompletionItem... extracted to new node module _vscode-languageserver-types_. The new node module is shared between the server and client and can also be used by language service libraries that want to use the same data types.

### 2.3.0: Client only

* the client now restarts the server if the server crashes without a prior exit notification sent. The strategy used to restart the server is pluggable (see `LanguageClientOptions.errorHandler`). The default strategy restart the server unless it crashed 5 times or more in the last 3 minutes. 

### 2.0: A detailed desciption of the 2.0 version can be found [here](https://github.com/Microsoft/vscode-languageserver-protocol/blob/master/README.md). A summary of the changes:

* support for request cancellation. Cancellation is automatically hooked to VSCode's cancellation tokens
* document save notification.
* Synced text documents carry VSCode's text document version number

### 1.1.x: Provides all language service feature available in the extension host via the language client / server protocol. Features added:

* Code Actions: provide actions to fix diagnostic problems.
* Code Lens: provide commands that are shown along with source text.
* Formatting: whole document, document ranges and formatting on type.
* Rename refactoring: provides renaming symbols.

### 1.0.x: Version which provides support for the following features:

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

### 0.10.x: Intial versions to build a good API for the client and server side


## License
[MIT](https://github.com/Microsoft/vscode-languageserver-node/blob/master/License.txt)
