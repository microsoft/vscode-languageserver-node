
#### Type Hierarchy

Many language support inheritance and LSP provides retrieving the hierarchy information with the following requests.


The `textDocument/subTypes` request is sent from the client to the server to resolve resolve the subtypes of a symbol at a given text document position. Returns the direct subtypes in no particular order.

_Client Capabilities_:

```ts
  TextDocumentClientCapabilities {
    /**
     * Capabilities specific to the `textDocument/subTypes`
     *  and `textDocument/superTypes
     */
    typeHierarchy?: {
    /**
     * Whether implementation supports dynamic registration.
     */
    dynamicRegistration?: boolean;
  };
```

_Server Capabilities_:
```ts
ServerCapabilities{
  /**
   * The server provides type hierarchy information
   */
  typeHierarchyProvider?: boolean
}
```

```ts
/**
 * Represents hierarchical information about programming constructs like variables, classes,
 * interfaces etc.
 */
export interface SymbolNode extends SymbolInformation {
  /**
   * Immediate descendants of this node
   */
  descendants? : SymbolNode[]
  /**
   * true if this node has children. hasChildren can be
   * true even when the descendants are empty. In that case
   * the clients should do a call to retrieve the descendants.
   */
  hasChildren: boolean
}
```

_Request_:

method: ‘textDocument/subTypes’
params: TextDocumentPositionParams

_Response_

* result: `SymbolNode[] | null`
* error: code and message set in case an exception happens during the 'textDocument/subTypes' request



The `textDocument/superTypes` request is sent from the client to the server to resolve resolve the supertypes of a symbol at a given text document position. Returns all the supertypes in bottom-up order.

_Request_:

method: ‘textDocument/superTypes’
params: TextDocumentPositionParams

_Response_

* result: `SymbolNode[] | null`
* error: code and message set in case an exception happens during the 'textDocument/superTypes' request

