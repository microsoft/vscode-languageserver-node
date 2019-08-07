/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import * as lsclient from 'vscode-languageclient/lib/main';
import * as path from 'path';

suite('Client integration', () => {

    test('InitializeResult', (done) => {
        let serverModule = path.join(__dirname, './servers/testInitializeResult.js');
        let serverOptions: lsclient.ServerOptions = {
            run: { module: serverModule, transport: lsclient.TransportKind.ipc },
            debug: { module: serverModule, transport: lsclient.TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6014'] } }
        };
        let documentSelector: lsclient.DocumentSelector = ['css'];
        let clientOptions: lsclient.LanguageClientOptions = {
            documentSelector, synchronize: {}, initializationOptions: {},
            middleware: {
                handleDiagnostics: (uri, diagnostics, next) => {
                    assert.equal(uri, "uri:/test.ts");
                    assert.ok(Array.isArray(diagnostics));
                    assert.equal(diagnostics.length, 0);
                    next(uri, diagnostics);
                    disposable.dispose();
                    done();
                }
            }
        };
        let client = new lsclient.LanguageClient('css', 'Test Language Server', serverOptions, clientOptions);
        let disposable = client.start();

        assert.equal(client.initializeResult, undefined);

        client.onReady().then(_ => {
            try {
                let expected = {
                    capabilities: {
                        textDocumentSync: 1,
                        completionProvider: { resolveProvider: true, triggerCharacters: ['"', ':'] },
                        hoverProvider: true,
                        renameProvider: {
                            prepareProvider: true
                        }
                    },
                    customResults: {
                        "hello": "world"
                    }
                };
                assert.deepEqual(client.initializeResult, expected);
            } catch (e) {
                disposable.dispose();
                done(e);
            }
        }, e => {
            disposable.dispose();
            done(e);
        });
    }).timeout(10000);
});