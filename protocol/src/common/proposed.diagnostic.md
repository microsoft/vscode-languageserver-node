#### <a href="#pull_diagnostic" name="pull_diagnostic" class="anchor">Pull Diagnostics</a>

Diagnostics are currently published by the server to the client using a notification. This model has the advantage that for workspace wide diagnostics the server has the freedom to compute them at a server preferred point in time. On the other hand the approach has the disadvantage that the server can't prioritize the computation for the file in which the user types or which are visible in the editor. Inferring the client's UI state from the `textDocument/didOpen` and `textDocument/didChange` notifications might lead to false positives since these notifications are ownership transfer notifications.

The specification therefore introduces the concept of diagnostic pull requests to give a client more control over the documents for which diagnostics should be computed and at which point in time.

_Client Capability_:
* property name (optional): `textDocument.diagnostic`
* property type: `DiagnosticClientCapabilities` defined as follows:

```typescript
/**
 * @since 3.17.0 - proposed state
 */
export type DiagnosticClientCapabilities = {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
	 * return value for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;

	/**
	 * Whether the clients supports related documents for document diagnostic pulls.
	 */
	relatedDocumentSupport?: boolean;
};
```

_Server Capability_:
* property name (optional): `diagnosticProvider`
* property type: `DiagnosticOptions` defined as follows:

```typescript
/**
 * Diagnostic options.
 *
 * @since 3.17.0 - proposed state
 */
export type DiagnosticOptions = WorkDoneProgressOptions & {
	/**
	 * An optional identifier under which the diagnostics are
	 * managed by the client.
	 */
	identifier?: string;

	/**
	 * Whether the language has inter file dependencies meaning that
	 * editing code in one file can result in a different diagnostic
	 * set in another file. Inter file dependencies are common for
	 * most programming languages and typically uncommon for linters.
	 */
	interFileDependencies: boolean;

	/**
	 * The server provides support for workspace diagnostics as well.
	 */
	workspaceDiagnostics: boolean;
};
```

_Registration Options_: `DiagnosticRegistrationOptions` options defined as follows:
```typescript
/**
 * Diagnostic registration options.
 *
 * @since 3.17.0 - proposed state
 */
export type DiagnosticRegistrationOptions = TextDocumentRegistrationOptions & DiagnosticOptions & StaticRegistrationOptions;
```

##### <a href="#textDocument_diagnostic" name="textDocument_diagnostic" class="anchor">Document Diagnostics(:leftwards_arrow_with_hook:)</a>

The text document diagnostic request is sent from the client to the server to ask the server to compute the diagnostics for a given document. As with other pull requests the server is asked to compute the diagnostics for the currently synced version of the document.

_Request_:
* method: 'textDocument/diagnostic'.
* params: `DocumentDiagnosticParams` defined as follows:

```typescript
/**
 * Parameters of the document diagnostic request.
 *
 * @since 3.17.0 - proposed state
 */
export type DocumentDiagnosticParams =  WorkDoneProgressParams & PartialResultParams & {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The additional identifier  provided during registration.
	 */
	identifier?: string;

	/**
	 * The result id of a previous response if provided.
	 */
	previousResultId?: string;
};
```

_Response_:
* result: `DocumentDiagnosticReport` defined as follows:

```typescript
/**
 * The result of a document diagnostic pull request. A report can
 * either be a full report containing all diagnostics for the
 * requested document or a unchanged report indicating that nothing
 * has changed in terms of diagnostics in comparison to the last
 * pull request.
 *
 * @since 3.17.0 - proposed state
 */
export type DocumentDiagnosticReport = RelatedFullDocumentDiagnosticReport | RelatedUnchangedDocumentDiagnosticReport;

/**
 * The document diagnostic report kinds.
 *
 * @since 3.17.0 - proposed state
 */
export enum DocumentDiagnosticReportKind {
	/**
	 * A diagnostic report with a full
	 * set of problems.
	 */
	full = 'full',

	/**
	 * A report indicating that the last
	 * returned report is still accurate.
	 */
	unChanged = 'unChanged'
}

/**
 * A diagnostic report with a full set of problems.
 *
 * @since 3.17.0 - proposed state
 */
export type FullDocumentDiagnosticReport = {
	/**
	 * A full document diagnostic report.
	 */
	kind: DocumentDiagnosticReportKind.full;

	/**
	 * An optional result id. If provided it will
	 * be sent on the next diagnostic request for the
	 * same document.
	 */
	resultId?: string;

	/**
	 * The actual items.
	 */
	items: Diagnostic[];
};

/**
 * A diagnostic report indicating that the last returned
 * report is still accurate.
 *
 * @since 3.17.0 - proposed state
 */
export type UnchangedDocumentDiagnosticReport = {
	/**
	 * A document diagnostic report indicating
	 * no changes to the last result. A server can
	 * only return `unchanged` if result ids are
	 * provided.
	 */
	kind: DocumentDiagnosticReportKind.unChanged;

	/**
	 * A result id which will be sent on the next
	 * diagnostic request for the same document.
	 */
	resultId: string;
};

/**
 * A full diagnostic report with a set of related documents.
 *
 * @since 3.17.0 - proposed state
 */
export type RelatedFullDocumentDiagnosticReport = FullDocumentDiagnosticReport & {
	/**
	 * Diagnostics of related documents. This information is useful
	 * in programming languages where code in a file A can generate
	 * diagnostics in a file B which A depends on. An example of
	 * such a language is C/C++ where marco definitions in a file
	 * a.cpp and result in errors in a header file b.hpp.
	 *
	 * @since 3.17.0 - proposed state
	 */
	relatedDocuments?: {
		[uri: string /** DocumentUri */]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
	};
};

/**
 * An unchanged diagnostic report with a set of related documents.
 *
 * @since 3.17.0 - proposed state
 */
export type RelatedUnchangedDocumentDiagnosticReport = UnchangedDocumentDiagnosticReport & {
	/**
	 * Diagnostics of related documents. This information is useful
	 * in programming languages where code in a file A can generate
	 * diagnostics in a file B which A depends on. An example of
	 * such a language is C/C++ where marco definitions in a file
	 * a.cpp and result in errors in a header file b.hpp.
	 *
	 * @since 3.17.0 - proposed state
	 */
	relatedDocuments?: {
		[uri: string /** DocumentUri */]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
	};
};
```
* partial result: The first literal send need to be a `DocumentDiagnosticReport` followed by n `DocumentDiagnosticReportPartialResult` literals defined as follows:

```typescript
/**
 * A partial result for a document diagnostic report.
 *
 * @since 3.17.0 - proposed state
 */
export type DocumentDiagnosticReportPartialResult = {
	relatedDocuments: {
		[uri: string /** DocumentUri */]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
	};
};
```
* error: code and message set in case an exception happens during the diagnostic request. A server is also allowed to return an error with code `ServerCancelled` indicating that the server can't compute the result right now. A server can return a `DiagnosticServerCancellationData` data to indicate whether the client should re-trigger the request. If no data is provided it defaults to `{ retriggerRequest: true }`:

```typescript
/**
 * Cancellation data returned from a diagnostic request.
 *
 * @since 3.17.0 - proposed state
 */
export type DiagnosticServerCancellationData = {
	retriggerRequest: boolean;
};
```

##### <a href="#workspace_diagnostic" name="workspace_diagnostic" class="anchor">Workspace Diagnostics(:leftwards_arrow_with_hook:)</a>

The workspace diagnostic request is sent from the client to the server to ask the server to compute workspace wide diagnostics which previously where pushed from the server to the client. In contrast to the document diagnostic request the workspace request can be long running and is not bound to a specific workspace or document state. If the client supports streaming for the workspace diagnostic pull it is legal to provide a document diagnostic report multiple times for the same document URI. The last one reported will win over previous reports.

If a client receives a diagnostic report for a document in a workspace diagnostic request for which the client also issues individual document diagnostic pull requests the client needs to decide which diagnostics win and should be presented. In general:

- diagnostics for a higher document version should win over those from a lower document version (e.g. note that document versions are steadily increasing)
- diagnostics from a document pull should win over diagnostics form a workspace pull if no version information is provided.

_Request_:
* method: 'workspace/diagnostic'.
* params: `WorkspaceDiagnosticParams` defined as follows:

```typescript
/**
 * Parameters of the workspace diagnostic request.
 *
 * @since 3.17.0 - proposed state
 */
export type WorkspaceDiagnosticParams = WorkDoneProgressParams & PartialResultParams & {
	/**
	 * The additional identifier provided during registration.
	 */
	identifier?: string;

	/**
	 * The currently known diagnostic reports with their
	 * previous result ids.
	 */
	previousResultIds: PreviousResultId[];
};

/**
 * A previous result id in a workspace pull request.
 *
 * @since 3.17.0 - proposed state
 */
export type PreviousResultId = {
	/**
	 * The URI for which the client knowns a
	 * result id.
	 */
	uri: DocumentUri;

	/**
	 * The value of the previous result id.
	 */
	value: string;
};
```

_Response_:
* result: `WorkspaceDiagnosticReport` defined as follows:

```typescript
/**
 * A workspace diagnostic report.
 *
 * @since 3.17.0 - proposed state
 */
export type WorkspaceDiagnosticReport = {
	items: WorkspaceDocumentDiagnosticReport[];
};

/**
 * A full document diagnostic report for a workspace diagnostic result.
 *
 * @since 3.17.0 - proposed state
 */
export type WorkspaceFullDocumentDiagnosticReport = FullDocumentDiagnosticReport & {

	/**
	 * The URI for which diagnostic information is reported.
	 */
	uri: DocumentUri;

	/**
	 * The version number for which the diagnostics are reported.
	 * If the document is not marked as open `null` can be provided.
	 */
	version: integer | null;
};

/**
 * An unchanged document diagnostic report for a workspace diagnostic result.
 *
 * @since 3.17.0 - proposed state
 */
export type WorkspaceUnchangedDocumentDiagnosticReport = UnchangedDocumentDiagnosticReport & {

	/**
	 * The URI for which diagnostic information is reported.
	 */
	uri: DocumentUri;

	/**
	 * The version number for which the diagnostics are reported.
	 * If the document is not marked as open `null` can be provided.
	 */
	version: integer | null;
};

/**
 * A workspace diagnostic document report.
 *
 * @since 3.17.0 - proposed state
 */
export type WorkspaceDocumentDiagnosticReport = WorkspaceFullDocumentDiagnosticReport | WorkspaceUnchangedDocumentDiagnosticReport;
```

* partial result: The first literal send need to be a `WorkspaceDiagnosticReport` followed by n `DocumentDiagnosticReportPartialResult` literals defined as follows:

```typescript
/**
 * A partial result for a workspace diagnostic report.
 *
 * @since 3.17.0 - proposed state
 */
export type WorkspaceDiagnosticReportPartialResult = {
	items: WorkspaceDocumentDiagnosticReport[];
};
```

* error: code and message set in case an exception happens during the diagnostic request. A server is also allowed to return and error with code `ServerCancelled` indicating that the server can't compute the result right now. A server can return a `DiagnosticServerCancellationData` data to indicate whether the client should re-trigger the request. If no data is provided it defaults to `{ retriggerRequest: true }`:

##### <a href="#diagnostic_refresh" name="diagnostic_refresh" class="anchor">Diagnostics Refresh(:arrow_right_hook:)</a>

The `workspace/diagnostic/refresh` request is sent from the server to the client. Servers can use it to ask clients to refresh all needed document and workspace diagnostics. This is useful if a server detects a project wide configuration change which requires a re-calculation of all diagnostics.

##### Implementation Considerations

Generally the language server specification doesn't enforce any specific client implementation since those usually depend on how the client UI behaves. However since diagnostics can be provided on a document and workspace level here are some tips:

- a client should pull actively for the document the users types in.
- if the server signals inter file dependencies a client should also pull for visible documents to ensure accurate diagnostics. However the pull should happen less frequently.
- if the server signals workspace pull support a client should also pull for workspace diagnostics. It is recommended for clients to implement partial result progress for the workspace pull to allow servers to keep the request open for a long time. If a server closes a workspace diagnostic pull request the client should re-trigger the request.