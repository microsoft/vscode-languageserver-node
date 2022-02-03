// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as proto from 'vscode-languageserver-protocol';
import * as p2c from 'vscode-languageclient/lib/common/protocolConverter';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "perf" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('testbed.helloWorld', () => {

		const counter = 5000;

		const converter = p2c.createConverter(undefined, false, false);
		const diagnostics: proto.Diagnostic[] = new Array(counter);

		for (let i = 0; i < counter; i++) {
			diagnostics[i] = proto.Diagnostic.create(
				proto.Range.create(1,1,1,1),
				'message',
				proto.DiagnosticSeverity.Error,
				'code',
				'source',
				[proto.DiagnosticRelatedInformation.create(
					proto.Location.create('file:///abc/file.abc', proto.Range.create(2,2,2,2)),
					'message'
				)]
			);
		}

		let start: number = 0;

		// const arr = new Array(counter).fill(2, 0, counter);
		// start = Date.now();
		// const converted = arr.map(item => item * 2);
		// console.log(`Time taken ${Date.now() - start}`);

		// start = Date.now();
		// const converted2 = new Array(arr.length);
		// for (let i = 0; i < arr.length; i++) {
		// 	converted2[i] = arr[i] * 2;
		// }
		// console.log(`Time taken ${Date.now() - start}`);

		// const message = JSON.stringify(diagnostics);
		// start = Date.now();
		// const parsed = JSON.parse(message);
		// const zero = `Time taken to parse LSP diagnostics ${Date.now() - start } ms`;

		start = Date.now();
		const converted = converter.asDiagnostics(diagnostics);
		const first = `Time taken to convert LSP into VS Code ${Date.now() - start } ms`;

		let asyncStart = Date.now();
		void converter.asDiagnosticsAsync(diagnostics, new vscode.CancellationTokenSource().token).then((_converted) => {
			console.log(`Time taken to convert LSP into VSCode async ${Date.now() - asyncStart }`);
		});

		// const direct: vscode.Diagnostic[] = new Array(counter);
		// start = Date.now();
		// for (let i = 0; i < counter; i++) {
		// 	const d = new vscode.Diagnostic(new vscode.Range(1, 1, 1, 1), 'message', vscode.DiagnosticSeverity.Error);
		// 	d.code = 'code';
		// 	d.source = 'source';
		// 	d.relatedInformation = [
		// 		new vscode.DiagnosticRelatedInformation(new vscode.Location(vscode.Uri.parse('file:///abc/file.abc'), new vscode.Range(2, 2, 2, 2)), 'message')
		// 	];
		// 	direct[i] = d;
		// }
		// const second = `Time taken create VS Code diagnostics directly ${Date.now() - start } ms`;

		// const literal: vscode.Diagnostic[] = new Array(counter);
		// start = Date.now();
		// for (let i = 0; i < counter; i++) {
		// 	const d = new vscode.Diagnostic(new vscode.Range(1, 1, 1, 1), 'message', vscode.DiagnosticSeverity.Error);
		// 	d.code = 'code';
		// 	d.source = 'source';
		// 	d.relatedInformation = [
		// 		{ location: { uri: vscode.Uri.parse('file:///abc/file.abc'), range: new vscode.Range(2, 2, 2, 2) }, message: 'message' }
		// 	];
		// 	literal[i] = d;
		// }
		// const third = `Time taken create VS Code diagnostics with literals ${Date.now() - start } ms`;

		//console.log(zero);
		console.log(first);
		// console.log(second);
		// console.log(third);

	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
