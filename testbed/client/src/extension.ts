/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import { commands, ExtensionContext, workspace, window } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, NotificationType, SuspendMode, DidOpenTextDocumentNotification } from 'vscode-languageclient/node';

let client: LanguageClient;

export async function activate(context: ExtensionContext) {
	// We need to go one level up since an extension compile the js code into
	// the output folder.
	const module = path.join(__dirname, '..', '..', 'server', 'out', 'server.js');
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6012'] };
	const serverOptions: ServerOptions = {
		run: { module, transport: TransportKind.ipc },
		debug: { module, /* runtime: 'node.exe', */ transport: TransportKind.ipc, options: debugOptions}
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ language: 'bat' },
			{ language: 'bat', notebook: '*' },
			{ scheme: 'file', pattern: '**/.vscode/test.txt' }
		],
		synchronize: {
			// configurationSection: 'testbed'
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
			onFocus: true,
			match: (selector, resource) => {
				const fsPath = resource.fsPath;
				return path.extname(fsPath) === '.bat';
			}
		}
	};

	client = new LanguageClient('testbed', 'Testbed', serverOptions, clientOptions);
	client.registerProposedFeatures();
	client.onTelemetry((data: any) => {
		console.log(`Telemetry event received: ${JSON.stringify(data)}`);
	});
	const not: NotificationType<string[]> = new NotificationType<string[]>('testbed/notification');
	try {
		await client.start();
	} catch (error) {
		client.error(`Start failed`, error, 'force');
	}
	try {
		await client.sendNotification(not, ['dirk', 'baeumer']);
	} catch(error) {
		client.error(`Sending test notification failed`, error, 'force');
	}
	commands.registerCommand('testbed.myCommand.invoked', () => {
		void commands.executeCommand('testbed.myCommand').then(value => {
			console.log(value);
		});
	});

	commands.registerCommand('testbed.openFile', () => {
		// most probably you want to register it to some command
		const testContent =
`REM @ECHO OFF
cd c:\\source
REM This is the location of the files that you want to sort
FOR %%f IN  (*.doc *.txt) DO XCOPY c:\\source\\"%%f" c:\\text /m /y
REM This moves any files with a .doc or
REM .txt extension from . c:\\source to c:\\textkkk
REM %%f is a variable
FOR %%f IN (*.jpg *.png *.bmp) DO XCOPY C:\\source\\"%%f" c:\\images /m /y
REM This moves any files with a .jpg, .png,
REM or .bmp extension from c:\\source to c:\\images;;`;

		void workspace
			.openTextDocument({
				content: testContent,
				language: 'bat',
			})
			.then(async doc => {
				await window.showTextDocument(doc);
			});
	});
}

export function deactivate() {
	return client.stop();
}