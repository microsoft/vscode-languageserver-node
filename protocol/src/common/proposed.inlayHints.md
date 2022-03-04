#### <a href="#textDocument_inlayHints" name="textDocument_inlayHints" class="anchor">Inlay Hints Request (:leftwards_arrow_with_hook:)</a>

> *Since version 3.17.0*
The inlay hints request is sent from the client to the server to compute inlay hints for a given [text document, range] tuple that may be rendered in the editor in place with other text.

_Client Capability_:
* property name (optional): `textDocument.inlayHints`
* property type: `InlayHintClientCapabilities` defined as follows:

<div class="anchorHolder"><a href="#inlayHintClientCapabilities" name="inlayHintClientCapabilities" class="linkableAnchor"></a></div>

```typescript
/**
 * Inlay hint client capabilities
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintClientCapabilities = {

	/**
	 * Whether inlay hints support dynamic registration.
	 */
	dynamicRegistration?: boolean;

	/**
	 * The client supports the following `InlayHint` specific
	 * capabilities.
	 */
	inlayHint?: {

		/**
		 * Indicates which properties a client can resolve lazily on a inlay
		 * hint.
		 */
		resolveSupport?: {

			/**
			 * The properties that a client can resolve lazily.
			 */
			properties: string[];
		};
	};
};
```

_Server Capability_:
* property name (optional): `inlayHintsProvider`
* property type: `InlayHintsOptions` defined as follows:

<div class="anchorHolder"><a href="#inlayHintsOptions" name="inlayHintsOptions" class="linkableAnchor"></a></div>

```typescript
/**
 * Inlay hints options used during static registration.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintsOptions = WorkDoneProgressOptions & {
	/**
	 * The server provides support to resolve additional
	 * information for an inlay hint item.
	 */
	resolveProvider?: boolean;
};
```

_Registration Options_: `InlayHintsRegistrationOptions` defined as follows:

<div class="anchorHolder"><a href="#inlayHintsRegistrationOptions" name="inlayHintsRegistrationOptions" class="linkableAnchor"></a></div>

```typescript
/**
 * Inlay hints options used during static or dynamic registration.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintsRegistrationOptions = InlayHintsOptions
	& TextDocumentRegistrationOptions & StaticRegistrationOptions;
```

_Request_:
* method: `textDocument/inlayHints`
* params: `InlayHintsParams` defined as follows:

<div class="anchorHolder"><a href="#inlayHintsParams" name="inlayHintsParams" class="linkableAnchor"></a></div>

```typescript
/**
 * A parameter literal used in inlay hints requests.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintsParams = WorkDoneProgressParams & {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The visible document range for which inlay hints should be computed.
	 */
	viewPort: Range;
};
```

_Response_:
* result: `InlayHint[]` \| `null` defined as follows:

<div class="anchorHolder"><a href="#inlayHint" name="inlayHint" class="linkableAnchor"></a></div>

```typescript
/**
 * Inlay hint information.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHint = {

	/**
	 * The position of this hint.
	 */
	position: Position;

	/**
	 * The label of this hint. A human readable string or an array of
	 * InlayHintLabelPart label parts.
	 *
	 * *Note* that neither the string nor the label part can be empty.
	 */
	label: string | InlayHintLabelPart[];

	/**
	 * The kind of this hint. Can be omitted in which case the client
	 * should fall back to a reasonable default.
	 */
	kind?: InlayHintKind;

	/**
	 * The tooltip text when you hover over this item.
	 */
	tooltip?: string | MarkupContent;

	/**
	 * Render padding before the hint.
	 *
	 * Note: Padding should use the editor's background color, not the
	 * background color of the hint itself. That means padding can be used
	 * to visually align/separate an inlay hint.
	 */
	paddingLeft?: boolean;

	/**
	 * Render padding after the hint.
	 *
	 * Note: Padding should use the editor's background color, not the
	 * background color of the hint itself. That means padding can be used
	 * to visually align/separate an inlay hint.
	 */
	paddingRight?: boolean;
};
```

<div class="anchorHolder"><a href="#inlayHintLabelPart" name="inlayHintLabelPart" class="linkableAnchor"></a></div>

```typescript
/**
 * An inlay hint label part allows for interactive and composite labels
 * of inlay hints.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintLabelPart = {

	/**
	 * The value of this label part.
	 */
	value: string;

	/**
	 * The tooltip text when you hover over this label part. Depending on
	 * the client capability `inlayHint.resolveSupport` clients might resolve
	 * this property late using the resolve request.
	 */
	tooltip?: string | MarkupContent;

	/**
	 * An optional source code location that represents this
	 * label part.
	 *
	 * The editor will use this location for the hover and for code navigation
	 * features: This part will become a clickable link that resolves to the
	 * definition of the symbol at the given location (not necessarily the
	 * location itself), it shows the hover that shows at the given location,
	 * and it shows a context menu with further code navigation commands.
	 *
	 * Depending on the client capability `inlayHint.resolveSupport` clients
	 * might resolve this property late using the resolve request.
	 */
	location?: Location;

	/**
	 * An optional command for this label part.
	 *
	 * Depending on the client capability `inlayHint.resolveSupport` clients
	 * might resolve this property late using the resolve request.
	 */
	command?: Command;
};
```

<div class="anchorHolder"><a href="#inlayHintKind" name="inlayHintKind" class="linkableAnchor"></a></div>

```typescript
/**
 * Inlay hint kinds.
 *
 * @since 3.17.0 - proposed state
 */
export namespace InlayHintKind {

	/**
	 * An inlay hint that for a type annotation.
	 */
	export const Type = 1;

	/**
	 * An inlay hint that is for a parameter.
	 */
	export const Parameter = 2;
};
```

* error: code and message set in case an exception happens during the inlay hints request.

#### <a href="#inlayHint_resolve" name="inlayHint_resolve" class="anchor">Inlay Hint Resolve Request (:leftwards_arrow_with_hook:)</a>

The request is sent from the client to the server to resolve additional information for a given inlay hint. This is usually used to compute
the `tooltip`, `location` or `command` properties of a inlay hint's label part to avoid its unnecessary computation during the `textDocument/inlayHints` request.

Consider the clients announces the `label.location` property as a property that can be resolved lazy using the client capability

```typescript
textDocument.inlayHint.resolveSupport = { properties: ['edit'] };
```

then a code action

```typescript
{
    "title": "Do Foo"
}
```

needs to be resolved using the `codeAction/resolve` request before it can be applied.


#### <a href="#textDocument_inlayHints_refresh" name="textDocument_inlayHints_refresh" class="anchor">Inlay Hints Refresh Request  (:arrow_right_hook:)</a>

> *Since version 3.17.0*

The `workspace/inlayHints/refresh` request is sent from the server to the client. Servers can use it to ask clients to refresh the inlay hints currently shown in editors. As a result the client should ask the server to recompute the inlay hints for these editors. This is useful if a server detects a configuration change which requires a re-calculation of all inlay hints. Note that the client still has the freedom to delay the re-calculation of the inlay hints if for example an editor is currently not visible.

_Client Capability_:

* property name (optional): `workspace.inlayHints`
* property type: `InlayHintsWorkspaceClientCapabilities` defined as follows:

<div class="anchorHolder"><a href="#inlayHintsWorkspaceClientCapabilities" name="inlayHintsWorkspaceClientCapabilities" class="linkableAnchor"></a></div>

```typescript
/**
 * Client workspace capabilities specific to inlay hints.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintsWorkspaceClientCapabilities = {
	/**
	 * Whether the client implementation supports a refresh request sent from
	 * the server to the client.
	 *
	 * Note that this event is global and will force the client to refresh all
	 * inlay hints currently shown. It should be used with absolute care and
	 * is useful for situation where a server for example detects a project wide
	 * change that requires such a calculation.
	 */
	refreshSupport?: boolean;
};
```

_Request_:
* method: `workspace/inlayHints/refresh`
* params: none

_Response_:

* result: void
* error: code and message set in case an exception happens during the 'workspace/inlayHints/refresh' request


<!--- linable types addition

  - type: 'InlayHintClientCapabilities'
    link: '#inlayHintClientCapabilities'
  - type: 'InlayHintsOptions'
    link: '#inlayHintsOptions'
  - type: 'InlayHintsRegistrationOptions'
    link: '#inlayHintsRegistrationOptions'
  - type: 'InlayHintsParams'
    link: '#inlayHintsParams'
  - type: 'InlayHint'
    link: '#inlayHint'
  - type: 'InlayHintLabelPart'
    link: '#inlayHintLabelPart'
  - type: 'InlayHintKind'
    link: '#inlayHintKind'
  - type: 'InlayHintsWorkspaceClientCapabilities'
    link: '#inlayHintsWorkspaceClientCapabilities'
  - type: 'InlineValue'
    link: '#inlineValue'
  - type: 'InlineValuesWorkspaceClientCapabilities'
    link: '#inlineValuesWorkspaceClientCapabilities'

--->