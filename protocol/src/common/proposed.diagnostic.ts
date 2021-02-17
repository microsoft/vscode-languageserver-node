/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, Diagnostic } from 'vscode-languageserver-types';

import * as Is from './utils/is';
import { ProtocolRequestType } from './messages';
import {
	PartialResultParams, StaticRegistrationOptions, WorkDoneProgressParams, TextDocumentRegistrationOptions, WorkDoneProgressOptions, TextDocumentClientCapabilities
} from './protocol';


/**
 * @since 3.17.0
 */
export interface DiagnosticClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
	 * return value for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;
}

export interface $DiagnosticClientCapabilities {
	textDocument?: TextDocumentClientCapabilities & {
		diagnostic: DiagnosticClientCapabilities;
	}
}

export namespace DiagnosticPullModeFlags {
	/**
	 * Trigger the diagnostic pull on open only.
	 */
	export const onOpen: 1 = 1;

	/**
	 * Trigger the diagnostic pull on type only
	 */
	export const onType: 2 = 2;
	/**
	 * Trigger the diagnostic pull on save only
	 */
	export const onSave: 4 = 4;

	/**
	 * Trigger the diagnostic pull on open, type and save.
	 */
	export const all: number = onOpen & onType & onSave;

	export function is(value: any): value is DiagnosticPullModeFlags {
		return onType <= value && value <= all;
	}

	export function isOpen(value: number): boolean {
		return (value & onOpen) !== 0;
	}

	export function isType(value: number): boolean {
		return (value & onType) !== 0;
	}

	export function isSave(value: number): boolean {
		return (value & onSave) !== 0;
	}
}
export type DiagnosticPullModeFlags = number;


export namespace DiagnosticTriggerKind {
	/**
	 * The request got triggered through some API
	 */
	export const Invoked: 1 = 1;

	/**
	 * The request got triggered because the user opened a document.
	 */
	export const Opened: 2 = 2;

	/**
	 * The request got triggered because the user typed in a document.
	 */
	export const Typed: 3 = 3;

	/**
	 * The request got triggered because the user saved a document.
	 */
	export const Saved: 4 = 4;

	export function is(value: any): value is DiagnosticTriggerKind {
		return Invoked <= value && value <= Saved;
	}
}
export type DiagnosticTriggerKind = 1 | 2 | 3 | 4;


export interface DiagnosticContext {
	triggerKind: DiagnosticTriggerKind;
}

export interface DiagnosticParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * Additional context information.
	 */
	context: DiagnosticContext;
}

export interface DiagnosticOptions extends WorkDoneProgressOptions {
	/**
	 * An optional identifier under which the diagnostics are
	 * managed by the client.
	 */
	identifier?: string;

	/**
	 * An optional mode indicating when the client should
	 * pull. Defaults to `onOpen & onType`.
	 */
	mode? : DiagnosticPullModeFlags;
}

export interface DiagnosticRegistrationOptions extends TextDocumentRegistrationOptions, DiagnosticOptions, StaticRegistrationOptions {
}

export interface $DiagnosticServerCapabilities {
	diagnosticProvider?: boolean | DiagnosticOptions;
}

export interface DiagnosticServerCancellationData {
	retriggerRequest: boolean;
}

export namespace DiagnosticServerCancellationData {
	export function is(value: any): value is DiagnosticServerCancellationData {
		const candidate = value as DiagnosticServerCancellationData;
		return candidate && Is.boolean(candidate.retriggerRequest);
	}
}

/**
 * The result of a diagnostic pull request.
 */
export interface DiagnosticList {
	items: Diagnostic[];
}

export namespace DiagnosticRequest {
	export const method: 'textDocument/diagnostic' = 'textDocument/diagnostic';
	export const type = new ProtocolRequestType<DiagnosticParams, DiagnosticList, Diagnostic[], DiagnosticServerCancellationData, DiagnosticRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<DiagnosticParams, DiagnosticList | null, void>;
}