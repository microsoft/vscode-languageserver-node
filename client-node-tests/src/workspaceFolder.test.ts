'use strict';

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

import { WorkspaceFoldersFeature } from 'vscode-languageclient/lib/common/workspaceFolder';
import { BaseLanguageClient, MessageTransports, DidChangeWorkspaceFoldersParams, Disposable } from 'vscode-languageclient';
import * as proto from 'vscode-languageserver-protocol';

class TestLanguageClient extends BaseLanguageClient {
	protected createMessageTransports(): Promise<MessageTransports> {
		throw new Error('Method not implemented.');
	}
	onRequest(): Disposable {
		return {
			dispose: () => {}
		};
	}
	protected getLocale(): string {
		return 'en';
	}
}

type MaybeFolders = vscode.WorkspaceFolder[] | undefined;

class TestWorkspaceFoldersFeature extends WorkspaceFoldersFeature {
	public sendInitialEvent(currentWorkspaceFolders: MaybeFolders): void {
		super.sendInitialEvent(currentWorkspaceFolders);
	}

	public initializeWithFolders(currentWorkspaceFolders: MaybeFolders) {
		super.initializeWithFolders(currentWorkspaceFolders);
	}
}

function testEvent(initial: MaybeFolders, then: MaybeFolders, added: proto.WorkspaceFolder[], removed: proto.WorkspaceFolder[]) {
	const client = new TestLanguageClient('foo', 'bar', {});

	const send = sinon.spy((_p1: any, _p2: any) => {
		return Promise.resolve();
	});
	sinon.replace(client, 'sendNotification', send as any);

	const feature = new TestWorkspaceFoldersFeature(client);

	feature.initializeWithFolders(initial);
	feature.sendInitialEvent(then);

	assert.equal(send.callCount, 1, 'call count wrong');
	assert.equal(send.args[0].length, 2);

	const notification: DidChangeWorkspaceFoldersParams = send.args[0][1];
	assert.deepEqual(notification.event.added, added);
	assert.deepEqual(notification.event.removed, removed);
}

function testNoEvent(initial: MaybeFolders, then: MaybeFolders) {
	const client = new TestLanguageClient('foo', 'bar', {});

	const send = sinon.spy(() => {
		return Promise.resolve();
	});
	sinon.replace(client, 'sendNotification', send);

	const feature = new TestWorkspaceFoldersFeature(client);

	feature.initializeWithFolders(initial);
	feature.sendInitialEvent(then);

	assert.equal(send.callCount, 0, 'call count wrong');
}

suite('Workspace Folder Feature Tests', () => {
	const removedFolder = { uri: vscode.Uri.parse('file://xox/removed'), name: 'removedName', index: 0 };
	const addedFolder = { uri: vscode.Uri.parse('file://foo/added'), name: 'addedName', index: 0 };
	const addedProto = { uri: 'file://foo/added', name: 'addedName' };
	const removedProto = { uri: 'file://xox/removed', name: 'removedName' };

	test('remove/add', async () => {
		testEvent([removedFolder], [addedFolder], [addedProto], [removedProto]);
	});

	test('remove', async () => {
		testEvent([removedFolder], [], [], [removedProto]);
	});

	test('remove2', async () => {
		testEvent([removedFolder], undefined, [], [removedProto]);
	});

	test('add', async () => {
		testEvent([], [addedFolder], [addedProto], []);
	});

	test('add2', async () => {
		testEvent(undefined, [addedFolder], [addedProto], []);
	});

	test('noChange1', async () => {
		testNoEvent([addedFolder, removedFolder], [addedFolder, removedFolder]);
	});

	test('noChange2', async () => {
		testNoEvent([], []);
	});

	test('noChange3', async () => {
		testNoEvent(undefined, undefined);
	});
});



