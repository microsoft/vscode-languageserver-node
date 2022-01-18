#### <a href="#notebooks" name="notebooks" class="anchor">Notebooks</a>

Notebooks are becoming more and more popular. Adding support for them to the language server protocol allows notebook editors to reused language smarts provided by the server inside a notebook or a notebook cell, respectively. To reuse protocol parts and therefore server implementations notebooks are model in the following way:

- *notebook document*: a collection of notebook cells typically stored in a file on disk. A notebook document has a type and can be uniquely identified using a resource URI.
- *notebook cells*: holds the actual text content. Cells have a kind (either code or markdown). The actual text content of the cell is stored in a text document which can be synced to the server like all other text documents. Cell text documents have an URI however servers should not rely on any format for this URI since it is up to the client on how it will create these URIs. They can only be used to uniquely identify the cell text document.

The two concepts are defined as follows:

<div class="anchorHolder"><a href="#notebookDocument" name="notebookDocument" class="linkableAnchor"></a></div>

```typescript
/**
 * A notebook document.
 *
 * @since 3.17.0
 */
export interface NotebookDocument {

	/**
	 * The notebook document's uri.
	 */
	uri: URI;

	/**
	 * The type of the notebook.
	 */
	notebookType: string;

	/**
	 * The version number of this document (it will increase after each
	 * change, including undo/redo).
	 */
	version: integer;

	/**
	 * The cells of a notebook.
	 */
	cells: NotebookCell[];
}
```

<div class="anchorHolder"><a href="#notebookCell" name="notebookCell" class="linkableAnchor"></a></div>


```typescript
/**
 * A notebook cell.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookCell {

	/**
	 * The cell's kind
	 */
	kind: NotebookCellKind;

	/**
	 * The cell's text represented as a text document.
	 * The document's content is synced using the
	 * existing text document sync notifications.
	 */
	document: DocumentUri;
}
```

<div class="anchorHolder"><a href="#notebookCellKind" name="notebookCellKind" class="linkableAnchor"></a></div>

```typescript
/**
 * A notebook cell kind.
 *
 * @since 3.17.0 - proposed state
 */
export namespace NotebookCellKind {

	/**
     * A markup-cell is formatted source that is used for display.
     */
	export const Markup: 1 = 1;

	/**
     * A code-cell is source code.
     */
	export const Code: 2 = 2;
}
```

Next we describe how notebooks, notebook cells and the content of a notebook cell should be synchronized to a language server.

Syncing the text content of a cell is relatively easy since clients should model them as text documents. However since the URI of a notebook cell's text document should be opaque, servers can not know its scheme nor its path. However what is know is the notebook document itself. We therefore introduce a special filter for notebook cell documents:

<div class="anchorHolder"><a href="#notebookCellTextDocumentFilter" name="notebookCellTextDocumentFilter" class="linkableAnchor"></a></div>

```typescript
/**
 * A notebook cell text document filter denotes a cell text
 * document by different properties.
 *
 * @since 3.17.0 - proposed state.
 */
export type NotebookCellTextDocumentFilter = {
	/**
	 * A filter that matches against the notebook
	 * containing the notebook cell.
	 */
	notebookDocument: NotebookDocumentFilter;

	/**
	 * A language id like `python`.
	 *
	 * Will be matched against the language id of the
	 * notebook cell document.
	 */
	cellLanguage?: string;
};
```

<div class="anchorHolder"><a href="#notebookDocumentFilter" name="notebookDocumentFilter" class="linkableAnchor"></a></div>

```typescript
/**
 * A notebook document filter denotes a notebook document by
 * different properties.
 *
 * @since 3.17.0 - proposed state.
 */
export type NotebookDocumentFilter = {
	/** The type of the enclosing notebook. */
	notebookType: string;

	/** A Uri [scheme](#Uri.scheme), like `file` or `untitled`.
	 * Will be matched against the URI of the notebook. */
	scheme?: string;

	/** A glob pattern, like `*.ipynb`.
	 * Will be matched against the notebooks` URI path section.*/
	pattern?: string;
} | {
	/** The type of the enclosing notebook. */
	notebookType?: string;

	/** A Uri [scheme](#Uri.scheme), like `file` or `untitled`.
	 * Will be matched against the URI of the notebook. */
	scheme: string;

	/** A glob pattern, like `*.ipynb`.
	 * Will be matched against the notebooks` URI path section.*/
	pattern?: string;
} | {
	/** The type of the enclosing notebook. */
	notebookType?: string;

	/** A Uri [scheme](#Uri.scheme), like `file` or `untitled`.
	 * Will be matched against the URI of the notebook. */
	scheme?: string;

	/** A glob pattern, like `*.ipynb`.
	 * Will be matched against the notebooks` URI path section.*/
	pattern: string;
};
```

Given these structures a Python cell document in a Jupyter notebook stored on disk in a folder having `books1` in its path can be identified as follows;

```typescript
{ notebookDocument: { scheme: 'file', pattern '**/books1/**', notebookType: 'jupyter' }, cellLanguage: 'python' }
```

If a server registers for providers or text document synchronization these filters can be used together with formal filters. For example:

```typescript
[
	{ scheme: 'file', language: 'python' },
    { notebookDocument: { scheme: 'file', pattern '**/books1/**', notebookType: 'jupyter' }, cellLanguage: 'python' }
]
```

syncs all Python text documents store on disk and the notebook cell documents.

There are cases where simply syncing the text content of a cell is not enough for a server to reason about the cells content. Sometimes it is necessary to know which cells belong to which notebook. Consider a notebook that has two JavaScript cells with the following content

Cell one:

```javascript
function add(a, b) {
	return a + b;
}
```

Cell two:

```javascript
add(1, 2);
```

A linter that inspects the cells independently from each other might report an unused function `add` in cell one and a unknown identifier `add` in cell two. However if a server knows that both cells belong to the same notebooks it could analyse the content differently and hence avoid the two signaled diagnostics. To support such a scenario a server can register for notebook document synchronization. This synchronization is comparable to a text document synchronization in which the client sends corresponding open, change and close notifications. But instead of synchronizing text, a notebook document structure is synchronized.

_Client Capability_:

The following client capabilities are defined for notebook documents:

* property name (optional): `notebookDocument.synchronization`
* property type: `NotebookDocumentSyncClientCapabilities` defined as follows

<div class="anchorHolder"><a href="#notebookDocumentSyncClientCapabilities" name="notebookDocumentSyncClientCapabilities" class="linkableAnchor"></a></div>

```typescript
/**
 * Notebook specific client capabilities.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookDocumentSyncClientCapabilities {

	/**
	 * Whether implementation supports dynamic registration. If this is
	 * set to `true` the client supports the new
	 * `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
	 * return value for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;
}
```

_Server Capability_:

The following server capabilities are defined for notebook documents:

* property name (optional): `notebookDocumentSync`
* property type: `NotebookDocumentOptions | NotebookDocumentRegistrationOptions` where `NotebookDocumentOptions` is defined as follows:

<div class="anchorHolder"><a href="#notebookDocumentSyncOptions" name="notebookDocumentSyncOptions" class="linkableAnchor"></a></div>

```typescript
/**
 * Options specific to a notebook plus its cells
 * to be synced to the server.
 *
 * If a selector provider a notebook document
 * filter but no cell selector all cells of a
 * matching notebook document will be synced.
 *
 * If a selector provides no notebook document
 * filter but only a cell selector all notebook
 * document that contain at least one matching
 * cell will be synced.
 *
 * @since 3.17.0 - proposed state
 */
export type NotebookDocumentSyncOptions = {
	/**
	 * The notebook document to be synced
	 */
	notebookDocumentSelector?: ({
		/** The notebook documents to be synced */
		notebookDocumentFilter: NotebookDocumentFilter;
		/** The cells of the matching notebook to be synced */
		cellSelector?: { language: string }[];
	} | {
		/** The notebook documents to be synced */
		notebookDocumentFilter?: NotebookDocumentFilter;
		/** The cells of the matching notebook to be synced */
		cellSelector: { language: string }[];
	})[];

	/**
	 * Whether save notification should be forwarded to
	 * the server.
	 */
	save?: boolean;
};
```

_Registration Options_: `NotebookDocumentRegistrationOptions` defined as follows:

<div class="anchorHolder"><a href="#notebookDocumentSyncRegistrationOptions" name="notebookDocumentSyncRegistrationOptions" class="linkableAnchor"></a></div>

```typescript
/**
 * Registration options specific to a notebook.
 *
 * @since 3.17.0 - proposed state
 */
export type NotebookDocumentSyncRegistrationOptions = NotebookDocumentSyncOptions & StaticRegistrationOptions;
```

**Open notification for notebook documents**

_Notification_:

<div class="anchorHolder"><a href="#notebookDocument_didOpen" name="notebookDocument_didOpen" class="linkableAnchor"></a></div>

* method: `notebookDocument/didOpen`
* params: `DidOpenNotebookDocumentParams` defined as follows:

<div class="anchorHolder"><a href="#didOpenNotebookDocumentParams" name="didOpenNotebookDocumentParams" class="linkableAnchor"></a></div>

```typescript
/**
 * The params sent in a open notebook document notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface DidOpenNotebookDocumentParams {

	/**
	 * The notebook document that got opened.
	 */
	notebookDocument: NotebookDocument;
}
```

**Change notification for notebook documents**

_Notification_:

<div class="anchorHolder"><a href="#notebookDocument_didChange" name="notebookDocument_didChange" class="linkableAnchor"></a></div>

* method: `notebookDocument/didChange`
* params: `DidChangeNotebookDocumentParams` defined as follows:

<div class="anchorHolder"><a href="#didChangeNotebookDocumentParams" name="didChangeNotebookDocumentParams" class="linkableAnchor"></a></div>

```typescript
/**
 * The params sent in a change notebook document notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface DidChangeNotebookDocumentParams {

	/**
	 * The notebook document that did change. The version number points
	 * to the version after all provided changes have been applied.
	 */
	notebookDocument: VersionedNotebookDocumentIdentifier;

	/**
	 * The actual changes to the notebook document.
	 *
	 * The changes describe single state changes to the notebook document.
	 * So if there are two changes c1 (at array index 0) and c2 (at array
	 * index 1) for a notebook in state S then c1 moves the notebook from
	 * S to S' and c2 from S' to S''. So c1 is computed on the state S and
	 * c2 is computed on the state S'.
	 *
	 * To mirror the content of a notebook using change events use the following approach:
	 * - start with the same initial content
	 * - apply the 'notebookDocument/didChange' notifications in the order you receive them.
	 * - apply the `NotebookChangeEvent`s in a single notification in the order
	 *   you receive them.
	 */
	changes: NotebookDocumentChangeEvent[];
}
```

<div class="anchorHolder"><a href="#notebookDocumentChangeEvent" name="notebookDocumentChangeEvent" class="linkableAnchor"></a></div>

```typescript
/**
 * A change event for a notebook document.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookDocumentChangeEvent {
	cells: NotebookCellChange;
}
```

<div class="anchorHolder"><a href="#notebookCellChange" name="notebookCellChange" class="linkableAnchor"></a></div>

```typescript
/**
 * A change describing how to move a `NotebookCell`
 * array from state S' to S''.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookCellChange {
	/**
	 * The start oftest of the cell that changed.
	 */
	start: uinteger;

	/**
	 * The deleted cells
	 */
	deleteCount: uinteger;

	/**
	 * The new cells, if any
	 */
	cells?: NotebookCell[];
}
```

**Save notification for notebook documents**

_Notification_:

<div class="anchorHolder"><a href="#notebookDocument_didSave" name="notebookDocument_didSave" class="linkableAnchor"></a></div>

* method: `notebookDocument/didSave`
* params: `DidSaveNotebookDocumentParams` defined as follows:

<div class="anchorHolder"><a href="#didSaveNotebookDocumentParams" name="didSaveNotebookDocumentParams" class="linkableAnchor"></a></div>

```typescript
/**
 * The params sent in a save notebook document notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface DidSaveNotebookDocumentParams {
	/**
	 * The notebook document that got saved.
	 */
	notebookDocument: NotebookDocumentIdentifier;
}
```

**Close notification for notebook documents**

_Notification_:

<div class="anchorHolder"><a href="#notebookDocument_didClose" name="notebookDocument_didClose" class="linkableAnchor"></a></div>

* method: `notebookDocument/didClose`
* params: `DidCloseNotebookDocumentParams` defined as follows:

<div class="anchorHolder"><a href="#didCloseNotebookDocumentParams" name="didCloseNotebookDocumentParams" class="linkableAnchor"></a></div>

```typescript
/**
 * The params sent in a close notebook document notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface DidCloseNotebookDocumentParams {

	/**
	 * The notebook document that got opened.
	 */
	notebookDocument: NotebookDocumentIdentifier;
}
```

<div class="anchorHolder"><a href="#notebookDocumentIdentifier" name="notebookDocumentIdentifier" class="linkableAnchor"></a></div>

```typescript
/**
 * A literal to identify a notebook document in the client.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookDocumentIdentifier {
	/**
	 * The notebook document's uri.
	 */
	uri: URI;
}
```


<!--- linable types addition

  - type: 'NotebookDocument'
    link: '#notebookDocument'
  - type: 'NotebookCell'
    link: '#notebookCell'
  - type: 'NotebookCellKind'
    link: '#notebookCellKind'
  - type: 'NotebookCellTextDocumentFilter'
    link: '#notebookCellTextDocumentFilter'
  - type: 'NotebookDocumentFilter'
    link: '#notebookDocumentFilter'
  - type: 'NotebookDocumentSyncClientCapabilities'
    link: '#notebookDocumentSyncClientCapabilities'
  - type: 'NotebookDocumentSyncOptions'
    link: '#notebookDocumentSyncOptions'
  - type: 'NotebookDocumentSyncRegistrationOptions'
    link: '#notebookDocumentSyncRegistrationOptions'
  - type: 'notebookDocument/didOpen'
    link: '#notebookDocument_didOpen'
  - type: 'DidOpenNotebookDocumentParams'
    link: '#didOpenNotebookDocumentParams'
  - type: 'notebookDocument/didChange'
    link: '#notebookDocument_didChange'
  - type: 'DidChangeNotebookDocumentParams'
    link: '#didChangeNotebookDocumentParams'
  - type: 'NotebookDocumentChangeEvent'
    link: '#notebookDocumentChangeEvent'
  - type: 'NotebookCellChange'
    link: '#notebookCellChange'
  - type: 'notebookDocument/didSave'
    link: '#notebookDocument_didSave'
  - type: 'DidSaveNotebookDocumentParams'
    link: '#didSaveNotebookDocumentParams'
  - type: 'notebookDocument/didClose'
    link: '#notebookDocument_didClose'
  - type: 'DidCloseNotebookDocumentParams'
    link: '#didCloseNotebookDocumentParams'
  - type: 'NotebookDocumentIdentifier'
    link: '#notebookDocumentIdentifier'

--->


