/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import { commands, ExtensionContext, Uri } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, NotificationType, SuspendMode, DidOpenTextDocumentNotification } from 'vscode-languageclient/node';

let client: LanguageClient;
let id: number = 0;

export async function activate(context: ExtensionContext) {
	// We need to go one level up since an extension compile the js code into
	// the output folder.
	let module = path.join(__dirname, '..', '..', 'server', 'out', 'server.js');
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6012'] };
	let serverOptions: ServerOptions = {
		run: { module, transport: TransportKind.ipc },
		debug: { module, /* runtime: 'node.exe', */ transport: TransportKind.ipc, options: debugOptions}
	};

	let clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ language: 'bat' },
			{ language: 'bat', notebook: '*' },
			{ scheme: 'file', pattern: '**/.vscode/test.txt' }
		],
		synchronize: {
			configurationSection: 'testbed'
			// fileEvents: workspace.createFileSystemWatcher('**/*'),
		},
		diagnosticCollectionName: 'markers',
		initializationOptions: 'Chris it gets passed to the server',
		progressOnInitialization: true,
		stdioEncoding: 'utf8',
		// uriConverters: {
		// 	code2Protocol: (value: Uri) => {
		// 		return `vscode-${value.toString()}`
		// 	},
		// 	protocol2Code: (value: string) => {
		// 		return Uri.parse(value.substring(7))
		// 	}
		// },
		middleware: {
			didOpen: (document, next) => {
				return next(document);
			}
		},
		diagnosticPullOptions: {
			onTabs: true,
			onChange: true,
			match: (selector, resource) => {
				const fsPath = resource.fsPath;
				return path.extname(fsPath) === '.bat';
			}
		}
	};

	await runServer();
	await runServer();
	await runServer();
	await runServer();
	await runServer();
	await runServer();
	await runServer();
	await runServer();
	await runServer();
	await runServer();
	await runServer();
	await runServer();

	client = new LanguageClient('testbed' + id, 'Testbed' + id, serverOptions, clientOptions);
	client.registerProposedFeatures();

	await client.start();

	async function runServer() {
		client = new LanguageClient('testbed' + id, 'Testbed' + id, serverOptions, clientOptions);
		client.registerProposedFeatures();

		await client.start();
		await client.stop();

		id++;

	}
}

export function deactivate() {
	return client.stop();
}