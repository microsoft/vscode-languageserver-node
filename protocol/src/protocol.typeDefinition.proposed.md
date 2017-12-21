#### Goto Type Definition

_Client Capabilities_:

The client sets the following capability if it supports goto type definition.

```ts
	/**
	 * The text document client capabilities
	 */
	textDocument?: {
		/**
		 * Capabilities specific to the `textDocument/typeDefinition`
		 */
		typeDefinition?: {
			/**
			 * Whether implementation supports dynamic registration.
			 */
			dynamicRegistration?: boolean;
		};
	}
```

_Server Capabilities_:

The server answers with the following capabilities if it supports goto type definition

```ts
	/**
	 * The server provides Goto Type Definition support.
	 */
	typeDefinitionProvider?: boolean | (TextDocumentRegistrationOptions & StaticRegistrationOptions);
```

#### <a name="textDocument_typeDefinition"></a>Goto Type Definition Request

The goto type definition request is sent from the client to the server to resolve the type definition location of a symbol at a given text document position.

_Request_:
* method: 'textDocument/typeDefinition'
* params: [`TextDocumentPositionParams`](#textdocumentpositionparams)

_Response_:
* result: [`Location`](#location) | [`Location`](#location)[] | `null`
* error: code and message set in case an exception happens during the definition request.

_Registration Options_: `TextDocumentRegistrationOptions`