# Resource Changes

_Client Capabilities_:

The client sets the following capability if it supports resource changes.

```ts
/**
 * The workspace client capabilities
 */
workspace: {
  workspaceEdit?: {
      /**
      * The client supports resource changes
      * in `WorkspaceEdit`s.
      */
      resourceChanges?: boolean;
    };
}
```

_WorkspaceEdit_

The following additions are proposed for __WorkspaceEdit__.

_resourceChanges_

If client supports resource changes  `resourceChanges` are preferred over `changes` and `documentChanges`.
Resource changes supports rename, move, delete and content changes. They are applied in the
order that they are supplied, however clients may group the changes for optimization.
```ts

interface  WorkspaceEdit {

  resourceChanges?: ResourceChange[];

}
```

## ResourceChange
Changes to a folder or file on the workspace.

The following table describes the fields that are required depending on the intended operation.
Adheres to the same rules defined on `TextDocumentEdit` while applying the textual changes.

| Operation| `textDocument` | `newTextDocument` | `edits` |
| :------- | :-------------:| :----------------:|:--------:
| Move     |       X        |         X         |    null
| Delete   |       X        |        null       |    null
| Create   |      null      |         X         |     O
| Modify   |       X        |        null       |     X


```ts
/**
 * A resource change, that supports move, delete, create and modify operations.
 *
 * If both textDocument and newTextDocument has valid values this
 * is considered to be a move operation. The edits, if exists are ignored.
 *
 * If textDocument has a valid value while newTextDocument and edits are null it is treated
 * as a delete operation.
 *
 * If textDocument is null and newTextDocument has a valid value
 * a create operation is executed and the edits are applied to the newTextDocument if
 * they exist.
 *
 * If textDocument and edits are a valid and newTextDocument is null, a modify operation
 * is executed.
 */
export interface ResourceChange {

	/**
   * The current resource to change. Required when modifying, deleting or moving
   * resources.
	 */
  textDocument?: VersionedTextDocumentIdentifier;

	/**
   * The edits to be applied. Required only when modifying.
   * Optional for create operations.
	 */
  edits?: TextEdit[]

  /**
  * The new text document. Required for create and move operations.
  * otherwise null.
  *
  * Must be compatible with the textDocument ie. must be a file
  * if textDocument is not null and is a file uri.
  */
  newTextDocument?: TextDocumentIdentifier;

}
```
