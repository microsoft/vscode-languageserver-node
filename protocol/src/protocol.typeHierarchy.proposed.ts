/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat Inc and others . All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType } from 'vscode-jsonrpc';
import {SymbolInformation} from 'vscode-languageserver-types';
import {TextDocumentPositionParams, TextDocumentRegistrationOptions} from './protocol'

export interface TypeHierarchyClientCapabilities {
	/**
	 * The text document client capabilities
	 */
	textDocument?: {
		/**
		 * Capabilities specific to the `textDocument/subTypes` and `textDocument/superTypes`
		 */
		typeHierarchy?: {
			/**
			 * Whether implementation supports dynamic registration.
			 */
			dynamicRegistration?: boolean;
		};
	}
}

export interface TypeHierarchyServerCapabilities {
	/**
	 * The server provides type hierarchy information
	 */
	typeHierarchyProvider?: boolean
}

/**
 *
 */
export namespace SubTypesRequest {
  export const type = new RequestType<TextDocumentPositionParams, SymbolNode[], void, TextDocumentRegistrationOptions>('textDocument/subTypes');
}

/**
 *
 */
export namespace SuperTypesRequest {
  export const type = new RequestType<TextDocumentPositionParams, SymbolNode[], void, TextDocumentRegistrationOptions>('textDocument/superTypes');
}


/**
 * Represents hierarchical information about programming constructs like variables, classes,
 * interfaces etc.
 */
export interface SymbolNode extends SymbolInformation {
  /**
   * Immediate descendants of this node
   */
  descendants? : SymbolNode[]
  /**
   * true if this node has children. hasChildren can be
   * true even when the descendants are empty. In that case
   * the clients should do a call to retrieve the descendants.
   */
  hasChildren: boolean
}
