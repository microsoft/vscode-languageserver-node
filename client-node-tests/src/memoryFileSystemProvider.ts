/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as vscode from 'vscode';

export class MemoryFileSystemProvider implements vscode.FileSystemProvider {
	public readonly scheme = 'file-test';
	public readonly root = new FakeDirectory('');
	public readonly onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>().event;

	public watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
		return { dispose() { } };
	}

	public stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
		const [directoryUri, name] = this.splitUri(uri);
		const directory = this.getDirectory(directoryUri);
		if (!directory.children.has(name)) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}
		const child = directory.children.get(name);
		return {
			type: child instanceof FakeFile ? vscode.FileType.File : vscode.FileType.Directory,
			ctime: 1,
			mtime: 1,
			size: 1,
		};
	}

	public readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		const directory = this.getDirectory(uri);
		return Array.from(directory.children.values()).map((item) => [item.name, item.type]);
	}

	public createDirectory(uri: vscode.Uri): void | Thenable<void> {
		this.getDirectory(uri, { create: true });
	}

	public readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
		const [directoryUri, name] = this.splitUri(uri);
		const directory = this.getDirectory(directoryUri);
		if (!directory.children.has(name)) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}
		const child = directory.children.get(name);
		if (child instanceof FakeFile) {
			return child.content;
		} else {
			throw vscode.FileSystemError.FileIsADirectory(uri);
		}
	}

	public writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
		const [directoryUri, name] = this.splitUri(uri);
		const directory = this.getDirectory(directoryUri, options);
		const file = new FakeFile(name, directory, content);
		directory.children.set(name, file);
	}

	public delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
		const [directoryUri, name] = this.splitUri(uri);
		const directory = this.getDirectory(directoryUri);
		directory.children.delete(name);
	}

	public rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
		const [oldDirectoryUri, oldName] = this.splitUri(oldUri);
		const [newDirectoryUri, newName] = this.splitUri(newUri);
		const oldDirectory = this.getDirectory(oldDirectoryUri);
		if (!oldDirectory.children.has(oldName)) {
			throw vscode.FileSystemError.FileNotFound(oldUri);
		}
		const newDirectory = this.getDirectory(newDirectoryUri, { create: true });
		if (newDirectory.children.has(newName) && !options.overwrite) {
			throw vscode.FileSystemError.FileExists(newUri);
		}
		newDirectory.children.set(newName, oldDirectory.children.get(oldName)!);
		oldDirectory.children.delete(oldName);
	}

	private splitSegments(uri: vscode.Uri): string[] {
		return uri.path.split('/');
	}

	private splitUri(uri: vscode.Uri): [dirname: vscode.Uri, basename: string] {
		const segments = this.splitSegments(uri);
		const dirname = uri.with({ path: segments.slice(0, segments.length - 1).join('/') });
		const basename = segments[segments.length - 1];
		return [dirname, basename];
	}

	private getDirectory(uri: vscode.Uri, options?: { create?: boolean }): FakeDirectory {
		if (uri.path === '' || uri.path === '/') {
			return this.root;
		}
		const [parentUri, name] = this.splitUri(uri);
		const parentDirectory = this.getDirectory(parentUri, options);
		if (parentDirectory.children.has(name)) {
			const child = parentDirectory.children.get(name);
			if (child instanceof FakeDirectory) {
				return child;
			} else {
				throw vscode.FileSystemError.FileNotADirectory(uri);
			}
		} else if (options?.create === true) {
			const newDirectory = new FakeDirectory(name, parentDirectory);
			parentDirectory.children.set(name, newDirectory);
			return newDirectory;
		} else {
			throw vscode.FileSystemError.FileNotFound(uri);
		}
	}
}

abstract class FakeFileSystemItem {
	constructor(public name: string, public parent: FakeDirectory | undefined, public readonly type: vscode.FileType) { }
}

class FakeFile extends FakeFileSystemItem {
	constructor(name: string, parent: FakeDirectory, public readonly content: Uint8Array) {
		super(name, parent, vscode.FileType.File);
	}
}

class FakeDirectory extends FakeFileSystemItem {
	public readonly type = vscode.FileType.Directory;
	public readonly children = new Map<String, FakeFileSystemItem>();

	constructor(name: string, parent?: FakeDirectory) {
		super(name, parent, vscode.FileType.Directory);
	}
}
