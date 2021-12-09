/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare module 'vscode' {

	/**
	 * An event that is fired when files are going to be created.
	 *
	 * To make modifications to the workspace before the files are created,
	 * call the {@linkcode FileWillCreateEvent.waitUntil waitUntil}-function with a
	 * thenable that resolves to a {@link WorkspaceEdit workspace edit}.
	 */
	export interface FileWillCreateEvent {

		/**
		 * A cancellation token.
		 */
		readonly token: CancellationToken;

		/**
		 * The files that are going to be created.
		 */
		readonly files: readonly Uri[];

		/**
		 * Allows to pause the event and to apply a {@link WorkspaceEdit workspace edit}.
		 *
		 * *Note:* This function can only be called during event dispatch and not
		 * in an asynchronous manner:
		 *
		 * ```ts
		 * workspace.onWillCreateFiles(event => {
		 * 	// async, will *throw* an error
		 * 	setTimeout(() => event.waitUntil(promise));
		 *
		 * 	// sync, OK
		 * 	event.waitUntil(promise);
		 * })
		 * ```
		 *
		 * @param thenable A thenable that delays saving.
		 */
		waitUntil(thenable: Thenable<WorkspaceEdit>): void;

		/**
		 * Allows to pause the event until the provided thenable resolves.
		 *
		 * *Note:* This function can only be called during event dispatch.
		 *
		 * @param thenable A thenable that delays saving.
		 */
		waitUntil(thenable: Thenable<any>): void;
	}

	/**
	 * An event that is fired when files are going to be deleted.
	 *
	 * To make modifications to the workspace before the files are deleted,
	 * call the {@link FileWillCreateEvent.waitUntil `waitUntil}-function with a
	 * thenable that resolves to a {@link WorkspaceEdit workspace edit}.
	 */
	export interface FileWillDeleteEvent {

		/**
		 * A cancellation token.
		 */
		readonly token: CancellationToken;

		/**
		 * The files that are going to be deleted.
		 */
		readonly files: readonly Uri[];

		/**
		 * Allows to pause the event and to apply a {@link WorkspaceEdit workspace edit}.
		 *
		 * *Note:* This function can only be called during event dispatch and not
		 * in an asynchronous manner:
		 *
		 * ```ts
		 * workspace.onWillCreateFiles(event => {
		 * 	// async, will *throw* an error
		 * 	setTimeout(() => event.waitUntil(promise));
		 *
		 * 	// sync, OK
		 * 	event.waitUntil(promise);
		 * })
		 * ```
		 *
		 * @param thenable A thenable that delays saving.
		 */
		waitUntil(thenable: Thenable<WorkspaceEdit>): void;

		/**
		 * Allows to pause the event until the provided thenable resolves.
		 *
		 * *Note:* This function can only be called during event dispatch.
		 *
		 * @param thenable A thenable that delays saving.
		 */
		waitUntil(thenable: Thenable<any>): void;
	}

	/**
	 * An event that is fired when files are going to be renamed.
	 *
	 * To make modifications to the workspace before the files are renamed,
	 * call the {@link FileWillCreateEvent.waitUntil `waitUntil}-function with a
	 * thenable that resolves to a {@link WorkspaceEdit workspace edit}.
	 */
	export interface FileWillRenameEvent {

		/**
		 * A cancellation token.
		 */
		readonly token: CancellationToken;

		/**
		 * The files that are going to be renamed.
		 */
		readonly files: ReadonlyArray<{ readonly oldUri: Uri, readonly newUri: Uri }>;

		/**
		 * Allows to pause the event and to apply a {@link WorkspaceEdit workspace edit}.
		 *
		 * *Note:* This function can only be called during event dispatch and not
		 * in an asynchronous manner:
		 *
		 * ```ts
		 * workspace.onWillCreateFiles(event => {
		 * 	// async, will *throw* an error
		 * 	setTimeout(() => event.waitUntil(promise));
		 *
		 * 	// sync, OK
		 * 	event.waitUntil(promise);
		 * })
		 * ```
		 *
		 * @param thenable A thenable that delays saving.
		 */
		waitUntil(thenable: Thenable<WorkspaceEdit>): void;

		/**
		 * Allows to pause the event until the provided thenable resolves.
		 *
		 * *Note:* This function can only be called during event dispatch.
		 *
		 * @param thenable A thenable that delays saving.
		 */
		waitUntil(thenable: Thenable<any>): void;
	}
}