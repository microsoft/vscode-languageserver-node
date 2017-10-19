#### Document Colors Request

The document color request is sent from the client to the server to list all color refereces found in a given text document. Along with the range, a color value in RGB is returned.

Clients can use the result to decorate color references in an editor. For example:
- Color boxes showing the actual color next to the reference
- Show a color picker when a color reference is edited

The color presentation request is sent from the client to the server to obtain a list of presentations for a color value at a given location.
Clients can use the result to
- modify a color reference.
- show in a color picker and let users pick one of the presentations

_Server Capability_:

The server sets the following server capability if it is able to handle `textDocument/documentColor` and `textDocument/colorPresentation` requests:

```ts
/**
 * The server capabilities
 */
interface ServerCapabilities {
	/**
	 * The server provides color provider support.
	 */
	colorProvider?: ColorProviderOptions;
}

interface ColorProviderOptions {
}

```


_Request_:

* method: 'textDocument/documentColor'
* params: `DocumentColorParams` defined as follows

```ts
interface DocumentColorParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;
}
```

_Response_:
* result: `ColorInformation[]` defined as follows:
```ts
interface ColorInformation {
	/**
	 * The range in the document where this color appers.
	 */
	range: Range;

	/**
	 * The actual color value for this color range.
	 */
	color: Color;
}
/**
 * Represents a color in RGBA space.
 */
interface Color {

	/**
	 * The red component of this color in the range [0-1].
	 */
	readonly red: number;

	/**
	 * The green component of this color in the range [0-1].
	 */
	readonly green: number;

	/**
	 * The blue component of this color in the range [0-1].
	 */
	readonly blue: number;

	/**
	 * The alpha component of this color in the range [0-1].
	 */
	readonly alpha: number;
}
```
* error: code and message set in case an exception happens during the 'textDocument/documentColor' request



_Request_:

* method: 'textDocument/colorPresentation'
* params: `DocumentColorParams` defined as follows

```ts
interface ColorPresentationParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The color information to request presentations for.
	 */
	colorInfo: Color;

	/**
	 * The range where the color would be inserted. Serves as a context.
	 */
	range: Range;
}
```

_Response_:
* result: `ColorPresentation[]` defined as follows:
```ts
interface ColorPresentation {
	/**
	 * The label of this color presentation. It will be shown on the color
	 * picker header. By default this is also the text that is inserted when selecting
	 * this color presentation.
	 */
	label: string;
	/**
	 * An [edit](#TextEdit) which is applied to a document when selecting
	 * this presentation for the color.  When `falsy` the [label](#ColorPresentation.label)
	 * is used.
	 */
	textEdit?: TextEdit;
	/**
	 * An optional array of additional [text edits](#TextEdit) that are applied when
	 * selecting this color presentation. Edits must not overlap with the main [edit](#ColorPresentation.textEdit) nor with themselves.
	 */
	additionalTextEdits?: TextEdit[];
}
```
* error: code and message set in case an exception happens during the 'textDocument/colorPresentation' request