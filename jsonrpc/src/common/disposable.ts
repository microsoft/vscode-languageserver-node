/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface Disposable {
	/**
	 * Dispose this object.
	 */
	dispose(): void;
}

export namespace Disposable {
	export function create(func: () => void): Disposable {
		return {
			dispose: func
		};
	}
}

export class DisposableStore implements Disposable {

	private isDisposed: boolean;
	private readonly disposables: Set<Disposable>;

	constructor() {
		this.isDisposed = false;
		this.disposables = new Set<Disposable>();
	}

	/**
	 * Dispose of all registered disposables and mark this object as disposed.
	 *
	 * Any future disposables added to this object will be disposed of on `add`.
	 */
	public dispose(): void {
		if (this.isDisposed || this.disposables.size === 0) {
			return;
		}
		try {
			this.disposables.forEach(item => item.dispose());
		} finally {
			this.isDisposed = true;
			this.disposables.clear();
		}
	}

	public add<T extends Disposable>(t: T): T {
		if (this.isDisposed) {
			t.dispose();
		} else {
			this.disposables.add(t);
		}
		return t;
	}
}