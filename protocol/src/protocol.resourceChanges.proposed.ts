import { TextDocumentIdentifier } from "./main";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat Inc and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict'

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
