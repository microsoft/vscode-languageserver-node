#### Document Colors Request

The document color request is sent from the client to the server to list all color refereces found in a given text document. Along with the range, a color value in RGB is returned.

Clients can use the result to decorate color references in an editor. For example:
- Color boxes showing the actual color next to the reference
- Color pickers when a color references are edited

_Server Capability_:

The server sets the following server capability if it is able to handle `textDocument/documentColor` requests:

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
	range: Range;
	color: Color;
}
/**
 * Represents a color in RGBA space.
 */
class Color {

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