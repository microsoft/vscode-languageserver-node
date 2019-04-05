
#### Call Hierarchy

The LSP provides retrieving the call hierachy information with the following request.

_Client Capabilities_:

```ts
CallHierarchyClientCapabilities {
    /**
     * The text document client capabilities
     */
    textDocument?: {
        /**
         * Capabilities specific to the `textDocument/callHierarchy`
         */
        callHierarchy?: {
            /**
             * Whether implementation supports dynamic registration. If this is set to `true`
             * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
             * return value for the corresponding server capability as well.
             */
            dynamicRegistration?: boolean;
        };
    }
}
```

_Server Capabilities_:

```ts
CallHierarchyServerCapabilities {
    /**
     * The server provides Call Hierarchy support.
     */
    callHierarchyProvider?: boolean | (TextDocumentRegistrationOptions & StaticRegistrationOptions);
}
```

##### Call Hierarchy Request

_Request_:

The `textDocument/callHierarchy` request is sent from the client to the server to request the call hierarchy for a symbol defined (or referenced) at the given text document position.

Returns a collection of calls from one symbol to another.

* method: ‘textDocument/callHierarchy'
* params: `CallHierarchyParams` defined as follows:

```ts
export interface CallHierarchyParams extends TextDocumentPositionParams {
    /**
     * The direction of calls to provide.
     */
    direction: CallHierarchyDirection;
}

export namespace CallHierarchyDirection {
    export const Incoming: 1 = 1;
    export const Outgoing: 2 = 2;
}
```

_Response_:

The server will send a collection of `CallHierarchyCall` objects, or `null` if no callable symbol is found at the given document position.

Each `CallHierarchyCall` object defines a call from one `CallHierarchySymbol` to another.

* result: `CallHierarchyCall[]` | `null`

```ts
export interface CallHierarchyCall {

    /**
     * The source range of the reference. The range is a sub range of the `from` symbol range.
     */
    range: Range;

    /**
    * The symbol that contains the reference.
     */
    from: CallHierarchySymbol;

    /**
     * The symbol that is referenced.
    */
    to: CallHierarchySymbol;
}

export interface CallHierarchySymbol {

    /**
     * The name of the symbol targeted by the call hierarchy request.
     */
    name: string;

    /**
     * More detail for this symbol, e.g the signature of a function.
     */
    detail?: string;

    /**
     * The kind of this symbol.
     */
    kind: SymbolKind;

    /**
     * URI of the document containing the symbol.
     */
    uri: string;

    /**
     * The range enclosing this symbol not including leading/trailing whitespace but everything else
     * like comments. This information is typically used to determine if the the clients cursor is
     * inside the symbol to reveal in the symbol in the UI.
     */
    range: Range;

    /**
     * The range that should be selected and revealed when this symbol is being picked, e.g the name of a function.
     * Must be contained by the the `range`.
     */
    selectionRange: Range;
}
```
