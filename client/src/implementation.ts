/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as UUID from './utils/uuid';
import * as Is from './utils/is';

import {
    languages as Languages,
    Disposable,
    TextDocument,
    ProviderResult,
    Position as VPosition,
    Definition as VDefinition,
} from 'vscode';

import {
    ClientCapabilities,
    CancellationToken,
    ServerCapabilities,
    TextDocumentRegistrationOptions,
    DocumentSelector,
    ImplementationRequest,
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
    if (target[key] === void 0) {
        target[key] = {} as any;
    }
    return target[key];
}

export interface ProvideImplementationSignature {
    (document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDefinition>;
}

export interface ImplementationMiddleware {
    provideImplementation?: (
        this: void,
        document: TextDocument,
        position: VPosition,
        token: CancellationToken,
        next: ProvideImplementationSignature
    ) => ProviderResult<VDefinition>;
}

export class ImplementationFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {
    constructor(client: BaseLanguageClient) {
        super(client, ImplementationRequest.type);
    }

    public fillClientCapabilities(capabilites: ClientCapabilities): void {
        ensure(ensure(capabilites, 'textDocument')!, 'implementation')!.dynamicRegistration = true;
    }

    public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
        if (!capabilities.implementationProvider) {
            return;
        }
        if (capabilities.implementationProvider === true) {
            if (!documentSelector) {
                return;
            }
            this.register(this.messages, {
                id: UUID.generateUuid(),
                registerOptions: Object.assign({}, { documentSelector: documentSelector }),
            });
        } else {
            const implCapabilities = capabilities.implementationProvider;
            const id =
                Is.string(implCapabilities.id) && implCapabilities.id.length > 0
                    ? implCapabilities.id
                    : UUID.generateUuid();
            const selector = implCapabilities.documentSelector || documentSelector;
            if (selector) {
                this.register(this.messages, {
                    id,
                    registerOptions: Object.assign({}, { documentSelector: selector }),
                });
            }
        }
    }

    protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
        let client = this._client;
        let provideImplementation: ProvideImplementationSignature = (document, position, token) => {
            return client
                .sendRequest(
                    ImplementationRequest.type,
                    client.code2ProtocolConverter.asTextDocumentPositionParams(document, position),
                    token
                )
                .then(client.protocol2CodeConverter.asDefinitionResult, error => {
                    client.logFailedRequest(ImplementationRequest.type, error);
                    return Promise.resolve(null);
                });
        };
        let middleware = client.clientOptions.middleware!;
        return Languages.registerImplementationProvider(options.documentSelector!, {
            provideImplementation: (
                document: TextDocument,
                position: VPosition,
                token: CancellationToken
            ): ProviderResult<VDefinition> => {
                return middleware.provideImplementation
                    ? middleware.provideImplementation(document, position, token, provideImplementation)
                    : provideImplementation(document, position, token);
            },
        });
    }
}
