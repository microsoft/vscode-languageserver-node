// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as proto from 'vscode-languageserver-protocol';
import * as p2c from 'vscode-languageclient/$test/common/protocolConverter';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "perf" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('testbed.helloWorld', () => {

		const counter = 1000000;

		const converter = p2c.createConverter(undefined, false, false);
		// const diagnostics: proto.Diagnostic[] = new Array(counter);

		// for (let i = 0; i < counter; i++) {
		// 	diagnostics[i] = proto.Diagnostic.create(
		// 		proto.Range.create(1,1,1,1),
		// 		'message',
		// 		proto.DiagnosticSeverity.Error,
		// 		'code',
		// 		'source',
		// 		[proto.DiagnosticRelatedInformation.create(
		// 			proto.Location.create('file:///abc/file.abc', proto.Range.create(2,2,2,2)),
		// 			'message'
		// 		)]
		// 	);
		// }

		// let ranges: proto.Range[] = new Array(counter);
		// for (let i = 0; i < ranges.length; i++) {
		// 	ranges[i] = proto.Range.create(1, 1, 1, 1,);
		// }
		const message = JSON.stringify(new Array<proto.Range>(counter).fill(proto.Range.create(1, 1, 1, 1,), 0, counter));

		console.time('reviver');
		JSON.parse(message, (_key, value) => {
			if (value.start !== undefined && value.end !== undefined) {
				const start = (value as proto.Range).start;
				const end = (value as proto.Range).end;
				return new vscode.Range(start.line, start.character, end.line, end.character);
			}
			return value;
		});
		console.timeEnd('reviver');

		console.time('without reviver');
		const trad: vscode.Range[] = (JSON.parse(message) as proto.Range[]).map(range => converter.asRange(range));
		console.timeEnd('without reviver');

		// const message = JSON.stringify(diagnostics);
		// console.log(`Size of string message: ${message.length}`);
		// console.time('Time taken to parse LSP diagnostics');
		// const parsed = JSON.parse(message);
		// console.timeEnd('Time taken to parse LSP diagnostics');
		// let p = 0;
		// console.time('Time taken to find id');
		// for (let i = 0; i < message.length; i++) {
		// 	if (message[i] === '{') {
		// 		p++;
		// 	}
		// 	if (message[i] === '}') {
		// 		p--;
		// 	}
		// }
		// console.timeEnd('Time taken to find id');

		// start = Date.now();
		// const converted = converter.asDiagnostics(diagnostics);
		// const first = `Time taken to convert LSP into VS Code ${Date.now() - start } ms`;

		// let asyncStart = Date.now();
		// void converter.asDiagnosticsAsync(diagnostics, new vscode.CancellationTokenSource().token).then((_converted) => {
		// 	console.log(`Time taken to convert LSP into VSCode async ${Date.now() - asyncStart }`);
		// });

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

		// console.log(zero);
		// console.log(first);
		// console.log(second);
		// console.log(third);

	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
