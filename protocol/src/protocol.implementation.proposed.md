#### Goto Implementation

_Client Capabilities_:

The client sets the following capability if it supports goto implementation.

```ts
	/**
	 * The text document client capabilities
	 */
	textDocument?: {
		/**
		 * Capabilities specific to the `textDocument/implementation`
		 */
		implementation?: {
			/**
			 * Whether implementation supports dynamic registration.
			 */
			dynamicRegistration?: boolean;
		};
	}
```

_Server Capabilities_:

The server answer with the following cpatbility of it supports goto implementation

```ts
	/**
	 * The server provides Goto Implementation support.
	 */
	implementationProvider?: boolean | (TextDocumentRegistrationOptions & StaticRegistrationOptions);
```

#### <a name="textDocument_implementation"></a>Goto Implementation Request

The goto definition request is sent from the client to the server to resolve the implementation location of a symbol at a given text document position.

_Request_:
* method: 'textDocument/implementation'
* params: [`TextDocumentPositionParams`](#textdocumentpositionparams)

_Response_:
* result: [`Location`](#location) | [`Location`](#location)[] | `null`
* error: code and message set in case an exception happens during the definition request.

_Registration Options_: `TextDocumentRegistrationOptions`