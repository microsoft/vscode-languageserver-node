#### <a href="#textDocument_inlayHints" name="textDocument_inlayHints" class="anchor">Inlay hints</a>

Inlay hints are short textual annotations that are attached to points in the source code.
These typically spell out some inferred information, such as the parameter name when passing a value to a function.

```typescript
/**
 * Well-known kinds of information conveyed by InlayHints.
 * Clients may choose which categories to display according to user preferences.
 */
export enum InlayHintCategory {
	/**
	 * The range is an expression passed as an argument to a function.
	 * The label is the name of the parameter.
	 */
	Parameter = 'parameter',
	/**
	 * The range is an entity whose type is unknown.
	 * The label is its inferred type.
	 */
	Type = 'type'
}
```

The `textDocument/inlayHints` request is sent from the client to the server to retrieve inlay hints for a document.

_Client Capabilities_:

* property name (optional): `textDocument.inlayHints`
* property type: `InlayHintsClientCapabilities` defined as follows:

```typescript
interface InlayHintsClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to
	 * `true` the client supports the new `(TextDocumentRegistrationOptions &
	 * StaticRegistrationOptions)` return value for the corresponding server
	 * capability as well.
	 */
	dynamicRegistration?: boolean;
}
```

_Server Capability_:

* property name (optional): `inlayHintsProvider`
* property type: `boolean | InlayHintsOptions | InlayHintsRegistrationOptions` is defined as follows:

```typescript
export interface InlayHintsOptions extends WorkDoneProgressOptions {
}
```

_Registration Options_: `InlayHintsRegistrationOptions` defined as follows:

```typescript
export interface InlayHintsRegistrationOptions extends
	TextDocumentRegistrationOptions, InlayHintsOptions {
}
```

_Request_:

* method: `textDocument/inlayHints`
* params: `InlayHintsParams` defined as follows:

```typescript
export interface InlayHintsParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The range the inlay hints are requested for.
	 * If unset, returns all hints for the document.
	 */
	range?: Range;

	/**
	 * The categories of inlay hints that are interesting to the client.
	 * The client should filter out hints of other categories, so the server may
	 * skip computing them.
	 */
	only?: string[];
}
```

_Response_:

* result: `InlayHint[]`
* partial result: `InlayHint[]`
* error: code and message set in case an exception happens during the 'textDocument/inlayHint' request

`InlayHint` is defined as follows:

```typescript
/**
 * An inlay hint is a short textual annotation for a range of source code.
 */
export interface InlayHint {
	/**
	 * The text to be shown.
	 */
	label: string;

	/**
	 * The position within the code this hint is attached to.
	 */
	position: Position;

	/**
	 * The kind of information this hint conveys.
	 * May be an InlayHintCategory or any other value, clients should treat
	 * unrecognized values as if missing.
	 */
	category?: string;
}
```

**TODO**: Do we need a `/refresh` server->client call, like with SemanticTokens and Code Lens?

**TODO**: Likely future evolution: add a `/resolve` call enabling interactions with hints. Should we foreshadow this?
