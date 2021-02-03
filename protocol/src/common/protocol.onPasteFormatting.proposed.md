#### Document on Paste Formatting Request

The document on paste formatting request is sent from the client to the server to format parts of the document after content has been pasted into the document.

_Client capability_:

* property name (optional): `textDocument.onPasteFormatting`
* property type: `DocumentOnPasteFormattingClientCapabilities` defined as follows:

```ts
export interface DocumentOnPasteFormattingClientCapabilities {
	/**
	 * Whether on paste formatting supports dynamic registration
	 */
	dynamicRegistration?: boolean;
}
```

_Server capability_:

* property name (optional): `documentOnPasteFormattingProvider`
* property type: `DocumentOnPasteFormattingOptions` defined as follows:

```ts
export interface DocumentOnPasteFormattingOptions {
}
```

_Registration options_: `DocumentOnPasteFormattingRegistrationOptions` defined as follows:

```ts
export interface DocumentOnPasteFormattingRegistrationOptions extends TextDocumentRegistrationOptions, DocumentOnPasteFormattingOptions {
}
```

_Request_:

* method: 'textDocument/onPasteFormatting'
* params: `DocumentOnPasteFormattingParams` defined as follows:

```ts
export interface DocumentOnPasteFormattingParams {
	/**
	 * The document to format.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The range of the text that has been pasted into the document.
	 */
	range: Range;

	/**
	 * The formatting options.
	 */
	options: FormattingOptions;
}
```

_Response_:

* result: `TextEdit[] | null` describing the modification to the document.
* error: code and message sent in case an exception happens during the on paste formatting request.
