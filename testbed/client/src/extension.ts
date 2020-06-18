/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import { commands, ExtensionContext, Uri } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	// We need to go one level up since an extension compile the js code into
	// the output folder.
	let module = path.join(__dirname, '..', '..', 'server', 'out', 'server.js');
	let debugOptions = { execArgv: ["--nolazy", "--inspect=6012"] };
	let serverOptions: ServerOptions = {
		run: { module, transport: TransportKind.ipc },
		debug: { module, /* runtime: 'node.exe', */ transport: TransportKind.ipc, options: debugOptions}
	};

	let clientOptions: LanguageClientOptions = {
		documentSelector: [
			'bat',
			{ pattern: '**/.vscode/test.txt', scheme: 'file' }
		],
		synchronize: {
			configurationSection: 'testbed'
			// fileEvents: workspace.createFileSystemWatcher('**/*'),
		},
		diagnosticCollectionName: 'markers',
		initializationOptions: 'Chris it gets passed to the server',
		progressOnInitialization: true,
		stdioEncoding: 'utf8',
		uriConverters: {
			code2Protocol: (value: Uri) => {
				return `vscode-${value.toString()}`
			},
			protocol2Code: (value: string) => {
				return Uri.parse(value.substring(7))
			}
		},
		middleware: {
			didOpen: (document, next) => {
				next(document);
			}
		}
	}

	client = new LanguageClient('testbed', 'Testbed', serverOptions, clientOptions);
	client.registerProposedFeatures();
	// let not: NotificationType<string[], void> = new NotificationType<string[], void>('testbed/notification');
	client.onReady().then(() => {
		client.sendNotification('testbed/notification', ['dirk', 'baeumer']);
	});
	client.onTelemetry((data: any) => {
		console.log(`Telemetry event received: ${JSON.stringify(data)}`);
	});
	client.start();
	commands.registerCommand('testbed.myCommand.invoked', () => {
		commands.executeCommand('testbed.myCommand').then(value => {
			console.log(value);
		});
	});
}

export function deactivate() {
	return client.stop();
}