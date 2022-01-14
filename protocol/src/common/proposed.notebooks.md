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

Syncing the text content of a cell is relatively easy since clients should model them as text documents. However since the URI of a notebook cell's text document should be opaque server can not know its scheme nor its path. However what is know is the notebook document itself. We therefor introduce a special filter for notebook cell documents:

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

A linter that inspects the cells independently from each other might report a unused function `add` in cell one and a unknown identifier `add` in cell two. However if a server knows that both cells belong to the same notebooks it could analyse the content differently and hence avoid the two signaled diagnostics.

