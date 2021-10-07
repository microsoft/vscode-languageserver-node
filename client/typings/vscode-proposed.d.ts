/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

declare module 'vscode' {

	// New API since 1.61.0

	/**
	 * Represents a tab within the window
	 */
	export interface Tab {
		/**
		 * The text displayed on the tab
		 */
		readonly label: string;

		/**
		 * The index of the tab within the column
		 */
		readonly index: number;

		/**
		 * The column which the tab belongs to
		 */
		readonly viewColumn: ViewColumn;

		/**
		 * The resource represented by the tab if availble.
		 * Note: Not all tabs have a resource associated with them.
		 */
		readonly resource?: Uri;

		/**
		 * The identifier of the view contained in the tab
		 * This is equivalent to `viewType` for custom editors and `notebookType` for notebooks.
		 * The built-in text editor has an id of 'default' for all configurations.
		 */
		readonly viewId?: string;

		/**
		 * All the resources and viewIds represented by a tab
		 * {@link Tab.resource resource} and {@link Tab.viewId viewId} will
		 * always be at index 0.
		 */
		additionalResourcesAndViewIds: { resource?: Uri, viewId?: string }[];

		/**
		 * Whether or not the tab is currently active
		 * Dictated by being the selected tab in the active group
		 */
		readonly isActive: boolean;

		/**
		 * Moves a tab to the given index within the column.
		 * If the index is out of range, the tab will be moved to the end of the column.
		 * If the column is out of range, a new one will be created after the last existing column.
		 * @param index The index to move the tab to
		 * @param viewColumn The column to move the tab into
		 */
		move(index: number, viewColumn: ViewColumn): Thenable<void>;

		/**
		 * Closes the tab. This makes the tab object invalid and the tab
		 * should no longer be used for further actions.
		 */
		close(): Thenable<void>;
	}

	export namespace window {
		/**
		 * A list of all opened tabs
		 * Ordered from left to right
		 */
		export const tabs: readonly Tab[];

		/**
		 * The currently active tab
		 * Undefined if no tabs are currently opened
		 */
		export const activeTab: Tab | undefined;

		/**
		 * An {@link Event} which fires when the array of {@link window.tabs tabs}
		 * has changed.
		 */
		export const onDidChangeTabs: Event<readonly Tab[]>;

		/**
		 * An {@link Event} which fires when the {@link window.activeTab activeTab}
		 * has changed.
		 */
		export const onDidChangeActiveTab: Event<Tab | undefined>;
	}

	// Old API

	export interface OpenEditorInfo {
		name: string;
		resource: Uri;
	}

	export namespace window {
		export const openEditors: ReadonlyArray<OpenEditorInfo>;

		// todo@API proper event type
		export const onDidChangeOpenEditors: Event<void>;
	}

	//#region https://github.com/microsoft/vscode/issues/15533 --- Type hierarchy ---

	/**
	 * Represents an item of a type hierarchy, like a class or an interface.
	 */
	export class TypeHierarchyItem {
		/**
		 * The name of this item.
		 */
		name: string;

		/**
		 * The kind of this item.
		 */
		kind: SymbolKind;

		/**
		 * Tags for this item.
		 */
		tags?: ReadonlyArray<SymbolTag>;

		/**
		 * More detail for this item, e.g. the signature of a function.
		 */
		detail?: string;

		/**
		 * The resource identifier of this item.
		 */
		uri: Uri;

		/**
		 * The range enclosing this symbol not including leading/trailing whitespace
		 * but everything else, e.g. comments and code.
		 */
		range: Range;

		/**
		 * The range that should be selected and revealed when this symbol is being
		 * picked, e.g. the name of a class. Must be contained by the {@link TypeHierarchyItem.range range}-property.
		 */
		selectionRange: Range;

		/**
		 * Creates a new type hierarchy item.
		 *
		 * @param kind The kind of the item.
		 * @param name The name of the item.
		 * @param detail The details of the item.
		 * @param uri The Uri of the item.
		 * @param range The whole range of the item.
		 * @param selectionRange The selection range of the item.
		 */
		constructor(kind: SymbolKind, name: string, detail: string, uri: Uri, range: Range, selectionRange: Range);
	}

	/**
	 * The type hierarchy provider interface describes the contract between extensions
	 * and the type hierarchy feature.
	 */
	export interface TypeHierarchyProvider {

		/**
		 * Bootstraps type hierarchy by returning the item that is denoted by the given document
		 * and position. This item will be used as entry into the type graph. Providers should
		 * return `undefined` or `null` when there is no item at the given location.
		 *
		 * @param document The document in which the command was invoked.
		 * @param position The position at which the command was invoked.
		 * @param token A cancellation token.
		 * @returns One or multiple type hierarchy items or a thenable that resolves to such. The lack of a result can be
		 * signaled by returning `undefined`, `null`, or an empty array.
		 */
		prepareTypeHierarchy(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<TypeHierarchyItem | TypeHierarchyItem[]>;

		/**
		 * Provide all supertypes for an item, e.g all types from which a type is derived/inherited. In graph terms this describes directed
		 * and annotated edges inside the type graph, e.g the given item is the starting node and the result is the nodes
		 * that can be reached.
		 *
		 * @param item The hierarchy item for which super types should be computed.
		 * @param token A cancellation token.
		 * @returns A set of direct supertypes or a thenable that resolves to such. The lack of a result can be
		 * signaled by returning `undefined` or `null`.
		 */
		provideTypeHierarchySupertypes(item: TypeHierarchyItem, token: CancellationToken): ProviderResult<TypeHierarchyItem[]>;

		/**
		 * Provide all subtypes for an item, e.g all types which are derived/inherited from the given item. In
		 * graph terms this describes directed and annotated edges inside the type graph, e.g the given item is the starting
		 * node and the result is the nodes that can be reached.
		 *
		 * @param item The hierarchy item for which subtypes should be computed.
		 * @param token A cancellation token.
		 * @returns A set of direct subtypes or a thenable that resolves to such. The lack of a result can be
		 * signaled by returning `undefined` or `null`.
		 */
		provideTypeHierarchySubtypes(item: TypeHierarchyItem, token: CancellationToken): ProviderResult<TypeHierarchyItem[]>;
	}

	export namespace languages {
		/**
		 * Register a type hierarchy provider.
		 *
		 * @param selector A selector that defines the documents this provider is applicable to.
		 * @param provider A type hierarchy provider.
		 * @return {@link Disposable Disposable} that unregisters this provider when being disposed.
		 */
		export function registerTypeHierarchyProvider(selector: DocumentSelector, provider: TypeHierarchyProvider): Disposable;
	}
	//#endregion

}