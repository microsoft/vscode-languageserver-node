/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import { commands, ExtensionContext, Uri } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, ProposedFeatures } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
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
			{ notebookDocument: { scheme: 'file' }, cellLanguage: 'bat' },
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
		}
	};

	client = new LanguageClient('testbed', 'Testbed', serverOptions, clientOptions);
	// client.registerFeature(ProposedFeatures.createNotebookDocumentSyncFeature(client));
	client.registerProposedFeatures();
	// let not: NotificationType<string[], void> = new NotificationType<string[], void>('testbed/notification');
	void client.onReady().then(() => {
		return client.sendNotification('testbed/notification', ['dirk', 'baeumer']);
	});
	client.onTelemetry((data: any) => {
		console.log(`Telemetry event received: ${JSON.stringify(data)}`);
	});
	client.start();
	commands.registerCommand('testbed.myCommand.invoked', () => {
		void commands.executeCommand('testbed.myCommand').then(value => {
			console.log(value);
		});
	});
}

export function deactivate() {
	return client.stop();
}