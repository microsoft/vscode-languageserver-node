/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Disposable, Uri, Range, window, DecorationRenderOptions, TextEditorDecorationType, workspace, TextEditor } from 'vscode';
import {
	TextDocumentRegistrationOptions, ClientCapabilities, ServerCapabilities, DocumentSelector, NotificationHandler,
	SemanticHighlightingNotification, SemanticHighlightingParams, SemanticHighlightingInformation
} from 'vscode-languageserver-protocol';

import * as UUID from './utils/uuid';
import { TextDocumentFeature, BaseLanguageClient } from './client';

export class SemanticHighlightingFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {

	protected readonly toDispose: Disposable[];
	protected readonly decorations: Map<string, any>;
	protected readonly handlers: NotificationHandler<SemanticHighlightingParams>[];

	constructor(client: BaseLanguageClient) {
		super(client, SemanticHighlightingNotification.type);
		this.toDispose = [];
		this.decorations = new Map();
		this.handlers = [];
		this.toDispose.push({ dispose: () => this.decorations.clear() });
		this.toDispose.push(workspace.onDidCloseTextDocument(e => {
			const uri = e.uri.toString();
			if (this.decorations.has(uri)) {
				// TODO: do the proper disposal of the decorations.
				this.decorations.delete(uri);
			}
		}));
	}

	dispose(): void {
		this.toDispose.forEach(disposable => disposable.dispose());
		super.dispose();
	}

	fillClientCapabilities(capabilities: ClientCapabilities): void {
		if (!!capabilities.textDocument) {
			capabilities.textDocument = {};
		}
		capabilities.textDocument!.semanticHighlightingCapabilities = {
			semanticHighlighting: true
		};
	}


	initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!documentSelector) {
			return;
		}
		const capabilitiesExt: ServerCapabilities & { semanticHighlighting?: { scopes: string[][] | undefined } } = capabilities;
		if (capabilitiesExt.semanticHighlighting) {
			const { scopes } = capabilitiesExt.semanticHighlighting;
			if (scopes && scopes.length > 0) {
				// this.toDispose.push(this.semanticHighlightingService.register(this.languageId, scopes));
				const id = UUID.generateUuid();
				this.register(this.messages, {
					id,
					registerOptions: Object.assign({}, { documentSelector: documentSelector }, capabilitiesExt.semanticHighlighting)
				});
			}
		}
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		if (options.documentSelector === null) {
			return new Disposable(() => { });
		}
		const handler = this.newNotificationHandler.bind(this)();
		this._client.onNotification(SemanticHighlightingNotification.type, handler);
		return new Disposable(() => {
			const indexOf = this.handlers.indexOf(handler);
			if (indexOf !== -1) {
				this.handlers.splice(indexOf, 1);
			}
		})
	}

	protected newNotificationHandler(): NotificationHandler<SemanticHighlightingParams> {
		return (params: SemanticHighlightingParams) => {
			const editorPredicate = this.editorPredicate(params.textDocument.uri);
			window.visibleTextEditors.filter(editorPredicate).forEach(editor => this.applyDecorations(editor, params));
		};
	}

	protected editorPredicate(uri: string): (editor: TextEditor) => boolean {
		const predicateUri = Uri.parse(uri);
		return (editor: TextEditor) => editor.document.uri.toString() === predicateUri.toString();
	}

	protected applyDecorations(editor: TextEditor, params: SemanticHighlightingParams): void {
		console.log('TODO: Apply the decorations on the editor.', editor, params);
	}

	protected decorationType(options: DecorationRenderOptions = {}) {
		return window.createTextEditorDecorationType(options);
	}

	protected map2Decoration(lines: SemanticHighlightingInformation[]): [TextEditorDecorationType, Range[]] {
		console.log('TODO: Map the lines (and the tokens) to the desired decoration type.', lines);
		return [this.decorationType(), []];
	}

}
