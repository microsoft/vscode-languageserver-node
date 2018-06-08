/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
import * as assert from 'assert';
import {
    createConnection,
    IConnection,
    TextDocuments,
    InitializeParams,
    ServerCapabilities,
    CompletionItemKind,
} from '../../../../server/lib/main';

let connection: IConnection = createConnection();

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

let documents: TextDocuments = new TextDocuments();
documents.listen(connection);

connection.onInitialize(
    (params: InitializeParams): any => {
        assert.equal((params.capabilities.workspace as any).applyEdit, true);
        assert.equal(params.capabilities.workspace!.workspaceEdit!.documentChanges, true);
        assert.equal(params.capabilities.textDocument!.completion!.completionItem!.deprecatedSupport, true);
        let valueSet = params.capabilities.textDocument!.completion!.completionItemKind!.valueSet!;
        assert.equal(valueSet[0], 1);
        assert.equal(valueSet[valueSet.length - 1], CompletionItemKind.TypeParameter);
        console.log(params.capabilities);

        let capabilities: ServerCapabilities = {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['"', ':'],
            },
            hoverProvider: true,
        };
        return { capabilities, customResults: { hello: 'world' } };
    }
);

connection.onInitialized(() => {
    connection.sendDiagnostics({ uri: 'uri:/test.ts', diagnostics: [] });
});

// Listen on the connection
connection.listen();
