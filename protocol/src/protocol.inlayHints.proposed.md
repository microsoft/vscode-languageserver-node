
#### Inlay Hints

The LSP provides retrieving inlay hints information with the following request.

_Client Capabilities_:

```ts
InlayHintsClientCapabilities {
    /**
     * The text document client capabilities
     */
    textDocument?: {
        /**
         * Capabilities specific to the `textDocument/inlayHints`
         */
        inlayHints?: {
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
InlayHintsServerCapabilities {
    /**
     * The server provides Inlay Hint support.
     */
    inlayHintsProvider?: boolean | (TextDocumentRegistrationOptions & StaticRegistrationOptions);
}
```

##### Inlay Hints Request

_Request_:

The `textDocument/inlayHints` request is sent from the client to the server to request the hints for a given
text document.

Returns a collection of hints for the text document.

* method: ‘textDocument/inlayHints'
* params: `InlayHintsParams` defined as follows:

```ts
export interface InlayHintsParams {
    /**
     * The text document
     */
    textDocument: TextDocumentIdentifier;
}
```

_Response_:

The server will send a collection of `InlayHint` objects, or `null` if no hints are found.

Each `InlayHint` object defines a range and kind corresponding to the hint and a label
to be displayed inline in the editor.

* result: `InlayHint[]` | `null`

```ts
export interface InlayHint {

    /**
     * The source range of the hint.
     */
    range: Range;

    /**
    * The type of hint.
     */
    kind: InlayHintKind;

    /**
     * The label that is displayed the in editor
    */
    label: string;
}

/**
 * A set of predefined hint kinds
 */
export interface InlayHintKind {

	/**
	 * The hint is for type information
	 */
	export const TypeHint: InlayHintKind = 'TypeHint';

	/**
	 * The hint corresponds to parameter information
	 */
	export const ParameterHint: InlayHintKind = 'ParameterHint';

	/**
	 * The hint corresponds to method chaining
	 */
	export const ChainingHint: InlayHintKind = 'ChainingHint';
}
```