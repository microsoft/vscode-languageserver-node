#### <a href="#textDocument_inlineValues" name="textDocument_inlineValues" class="anchor">Inline Values Request (:leftwards_arrow_with_hook:)</a>

> *Since version 3.17.0*
The inline values request is sent from the client to the server to compute inline values for a given text document that may be rendered in the editor at the end of lines.

_Client Capability_:
* property name (optional): `textDocument.inlineValues`
* property type: `InlineValuesClientCapabilities` defined as follows:

<div class="anchorHolder"><a href="#inlineValuesClientCapabilities" name="inlineValuesClientCapabilities" class="linkableAnchor"></a></div>

```typescript
/**
 * Client capabilities specific to inline values.
 */
export interface InlineValuesClientCapabilities {
	/**
	 * Whether inline values supports dynamic registration.
	 */
	dynamicRegistration?: boolean;
}
```

_Server Capability_:
* property name (optional): `inlineValuesProvider`
* property type: `InlineValuesOptions` defined as follows:

<div class="anchorHolder"><a href="#inlineValuesOptions" name="inlineValuesOptions" class="linkableAnchor"></a></div>

```typescript
export interface InlineValuesOptions extends WorkDoneProgressOptions {
}
```

_Registration Options_: `InlineValuesRegistrationOptions` defined as follows:

<div class="anchorHolder"><a href="#inlineValuesRegistrationOptions" name="inlineValuesRegistrationOptions" class="linkableAnchor"></a></div>

```typescript
export interface InlineValuesRegistrationOptions extends
	TextDocumentRegistrationOptions, InlineValuesOptions {
}
```

_Request_:
* method: `textDocument/inlineValues`
* params: `InlineValuesParams` defined as follows:

<div class="anchorHolder"><a href="#inlineValuesParams" name="inlineValuesParams" class="linkableAnchor"></a></div>

```typescript
interface InlineValuesParams extends WorkDoneProgressParams {
	/**
	 * The document to request inline values for.
	 */
	readonly textDocument: TextDocumentIdentifier;
	/**
	 * The visible document range for which inline values should be computed.
	 */
	readonly viewPort: Range;
	/**
	 * Additional information about the context in which inline values were
	 * requested.
	 */
	readonly context: InlineValuesContext;
}
```

<div class="anchorHolder"><a href="#inlineValuesContext" name="inlineValuesContext" class="linkableAnchor"></a></div>

```typescript
interface InlineValuesContext {
	/**
	 * The document range where execution has stopped.
	 * Typically the end position of the range denotes the line where the inline values are shown.
	 */
	readonly stoppedLocation: Range;
}
```

_Response_:
* result: `InlineValue[]` \| `null` defined as follows:

<div class="anchorHolder"><a href="#inlineValue" name="inlineValue" class="linkableAnchor"></a></div>

```typescript
/**
 * Inline value information can be provided by different means:
 * - directly as a text value (class InlineValueText).
 * - as a name to use for a variable lookup (class InlineValueVariableLookup)
 * - as an evaluatable expression (class InlineValueEvaluatableExpression)
 * The InlineValue types combines all inline value types into one type.
 */
export type InlineValue = InlineValueText | InlineValueVariableLookup | InlineValueEvaluatableExpression;

/**
 * Provide inline value as text.
 */
export class InlineValueText {
	/**
	 * The document range for which the inline value applies.
	 */
	readonly range: Range;
	/**
	 * The text of the inline value.
	 */
	readonly text: string;
}

/**
 * Provide inline value through a variable lookup.
 * If only a range is specified, the variable name will be extracted from the underlying document.
 * An optional variable name can be used to override the extracted name.
 */
export class InlineValueVariableLookup {
	/**
	 * The document range for which the inline value applies.
	 * The range is used to extract the variable name from the underlying document.
	 */
	readonly range: Range;

	/**
	 * If specified the name of the variable to look up.
	 */
	readonly variableName?: string;

	/**
	 * How to perform the lookup.
	 */
	readonly caseSensitiveLookup: boolean;
}

/**
 * Provide an inline value through an expression evaluation.
 * If only a range is specified, the expression will be extracted from the underlying document.
 * An optional expression can be used to override the extracted expression.
 */
export class InlineValueEvaluatableExpression {
	/**
	 * The document range for which the inline value applies.
	 * The range is used to extract the evaluatable expression from the underlying document.
	 */
	readonly range: Range;

	/**
	 * If specified the expression overrides the extracted expression.
	 */
	readonly expression?: string;
}
```
* error: code and message set in case an exception happens during the inline values request.

#### <a href="#textDocument_inlineValues_refresh" name="textDocument_inlineValues_refresh" class="anchor">Inline Values Refresh Request  (:arrow_right_hook:)</a>

> *Since version 3.17.0*

The `workspace/inlineValues/refresh` request is sent from the server to the client. Servers can use it to ask clients to refresh the inline values currently shown in editors. As a result the client should ask the server to recompute the inline values for these editors. This is useful if a server detects a configuration change which requires a re-calculation of all inline values. Note that the client still has the freedom to delay the re-calculation of the inline values if for example an editor is currently not visible.

_Client Capability_:

* property name (optional): `workspace.inlineValues`
* property type: `InlineValuesWorkspaceClientCapabilities` defined as follows:
<div class="anchorHolder"><a href="#inlineValuesWorkspaceClientCapabilities" name="inlineValuesWorkspaceClientCapabilities" class="linkableAnchor"></a></div>

```typescript
export interface InlineValuesWorkspaceClientCapabilities {
	/**
	 * Whether the client implementation supports a refresh request sent from the
	 * server to the client.
	 *
	 * Note that this event is global and will force the client to refresh all
	 * inline values currently shown. It should be used with absolute care and is
	 * useful for situation where a server for example detect a project wide
	 * change that requires such a calculation.
	 */
	refreshSupport?: boolean;
}
```
_Request_:
<div class="anchorHolder"><a href="#inlineValues_refreshRequest" name="inlineValues_refreshRequest" class="linkableAnchor"></a></div>
* method: `workspace/inlineValues/refresh`
* params: none

_Response_:

* result: void
* error: code and message set in case an exception happens during the 'workspace/inlineValues/refresh' request