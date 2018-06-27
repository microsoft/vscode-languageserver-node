#### Semantic Highlighting

While the syntax highlighting is done on the client-side and can handle keywords, strings, and other low-level tokens from the grammar, it cannot adequately support complex coloring. Semantic highlighting information is calculated on the language server and pushed to the client as a notification. This notification carries information about the ranges that have to be colored. The desired coloring details are given as [TextMate scopes](https://manual.macromates.com/en/language_grammars) for each affected range. For the semantic highlighting information the following additions are proposed:

_Client Capabilities_:

Capability that has to be set by the language client if it can accept and process the semantic highlighting information received from the server.

```ts
/**
 * The text document client capabilities.
 */
textDocument?: {

	/**
	 * The client's semantic highlighting capability.
	 */
	semanticHighlightingCapabilities?: {

		/**
		 * `true` if the client supports semantic highlighting support text documents. Otherwise, `false`. It is `false` by default.
		 */
		semanticHighlighting: boolean;

	}

}
```

_Server Capabilities_:

If the client declares its capabilities with respect to the semantic highlighting feature, and if the server supports this feature too, the server should set all the available TextMate scopes as a "lookup table" during the `initialize` request.

```ts
/**
 * Semantic highlighting server capabilities.
 */
semanticHighlighting?: {

	/**
	 * A "lookup table" of semantic highlighting [TextMate scopes](https://manual.macromates.com/en/language_grammars)
	 * supported by the language server. If not defined or empty, then the server does not support the semantic highlighting
	 * feature. Otherwise, clients should reuse this "lookup table" when receiving semantic highlighting notifications from
	 * the server.
	 */
	scopes?: string[][];
}
```

##### SemanticHighlighting Notification

The `textDocument/semanticHighlighting` notification is pushed from the server to the client to inform the client about additional semantic highlighting information that has to be applied on the text document. It is the server's responsibility to decide which lines are included in the highlighting information. In other words, the server is capable of sending only a delta information. For instance, after opening the text document (`DidOpenTextDocumentNotification`) the server sends the semantic highlighting information for the entire document, but if the server receives a `DidChangeTextDocumentNotification`, it pushes the information only about the affected lines in the document.

The server never sends delta notifications, if no new semantic highlighting ranges were introduced but the existing onces have been shifted. For instance, when inserting a new line to the very beginning of the text document. The server receives the `DidOpenTextDocumentNotification`, updates its internal state, so that the client and the server shares the same understanding about the highlighted positions but the server does not send any notifications to the client. In such cases, it is the client's responsibility to track this event and shift all existing markers.

The server can send a `SemanticHighlightingInformation` to the client without defining the `tokens` string. This means, the client must discard all semantic highlighting information in the line. For instance when commenting out a line.

_Notification_:

* method: 'workspace/semanticHighlighting'
* params: `SemanticHighlightingParams` defined as follows:

```ts
/**
 * Parameters for the semantic highlighting (server-side) push notification.
 */
export interface SemanticHighlightingParams {

	/**
	 * The text document that has to be decorated with the semantic highlighting information.
	 */
	textDocument: VersionedTextDocumentIdentifier;

	/**
	 * An array of semantic highlighting information.
	 */
	lines: SemanticHighlightingInformation[];

}

/**
 * Represents a semantic highlighting information that has to be applied on a specific line of the text document.
 */
export interface SemanticHighlightingInformation {

	/**
	 * The zero-based line position in the text document.
	 */
	line: number;

	/**
	 * A base64 encoded string representing every single highlighted characters with its start position, length and the "lookup table" index of
	 * of the semantic highlighting [TextMate scopes](https://manual.macromates.com/en/language_grammars).
	 * If the `tokens` is empty or not defined, then no highlighted positions are available for the line.
	 */
	tokens?: string;

}
```

_Tokens_:

Tokens are encoded in a memory friendly way straight from the wire. The `tokens` string encapsulates multiple tokens as a `base64` encoded string. A single semantic highlighting token can be interpreted as a range with additional TextMate scopes information. The following properties can be inferred from a single token: `character` is the zero-based offset where the range starts. It is represented as a 32-bit unsigned integer. The `length` property is the length of the range a semantic highlighting token. And finally, it also carries the TextMate `scope` information as an integer between zero and 2<sup>16</sup>-1 (inclusive) values. Clients must reuse the `scopes` "lookup table" from the `initialize` request if they want to map the `scope` index value to the actual TextMate scopes represented as a string.

_Encoding the Tokens_:

Following example shows how three individual tokens are encoded into its `base64` form.
Let assume, there is a series of token information (`[12, 15, 1, 2, 5, 0, 7, 1000, 1]`) that can be interpreted as the following.
```json
[
	{
		"character": 12,
		"length": 15,
		"scope": 1
	},
	{
		"character": 2,
		"length": 5,
		"scope": 0
	},
	{
		"character": 7,
		"length": 1000,
		"scope": 1
	}
]
```
The `character` (`12` )property will be stored as is but the `length` (`15`) and the `scope` (`1`) will be stored as a single 32-bit unsigned integer. The initial value of this 32-bit unsigned integer is zero. First, we set the value of the `length`, then we make some room (2<sup>16</sup>) for the `scope` by shifting the `length` 16 times to the left and applying a bitwise OR with the value of the `scope`.
```
00000000000000000000000000000000 // initial
00000000000000000000000000001111 // set the `length` value (15)
00000000000011110000000000000000 // shift [<< 0x0000010] the `length` and make some space for the scope
00000000000011110000000000000001 // bitwise OR the `scope` value (1)
```