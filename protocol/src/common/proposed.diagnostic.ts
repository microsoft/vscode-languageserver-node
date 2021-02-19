/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler0, RequestHandler } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, Diagnostic } from 'vscode-languageserver-types';

import * as Is from './utils/is';
import { ProtocolRequestType0, ProtocolRequestType } from './messages';
import {
	PartialResultParams, StaticRegistrationOptions, WorkDoneProgressParams, TextDocumentRegistrationOptions, WorkDoneProgressOptions, TextDocumentClientCapabilities
} from './protocol';


/**
 * @since 3.17.0 - proposed state
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

/**
 * @since 3.17.0 - proposed state
 */
export namespace DiagnosticPullModeFlags {
	/**
	 * Trigger the diagnostic pull on open.
	 */
	export const onOpen: 1 = 1;

	/**
	 * Trigger the diagnostic pull on focus gain.
	 */
	export const onFocusGain: 2 = 2;

	/**
	 * Trigger the diagnostic pull on focus lost.
	 */
	export const onFocusLost: 4 = 4;

	/**
	 * Trigger the diagnostic pull on document change.
	 */
	export const onChanged: 8 = 8;

	/**
	 * Trigger the diagnostic pull on save.
	 */
	export const onSave: 16 = 16;

	/**
	 * Trigger the diagnostic pull on close.
	 */
	export const onClose: 32 = 32;

	/**
	 * Trigger the diagnostic pull on open, type and save.
	 */
	export const all: number = onOpen | onChanged | onFocusGain | onFocusLost | onSave | onClose;

	export function is(value: any): value is DiagnosticPullModeFlags {
		return onChanged <= value && value <= all;
	}

	export function isOpen(value: number): boolean {
		return (value & onOpen) !== 0;
	}

	export function isChanged(value: number): boolean {
		return (value & onChanged) !== 0;
	}

	export function isFocusGain(value: number): boolean {
		return (value & onFocusGain) !== 0;
	}

	export function isFocusLost(value: number): boolean {
		return (value & onFocusLost) !== 0;
	}

	export function isSave(value: number): boolean {
		return (value & onSave) !== 0;
	}

	export function isClose(value: number): boolean {
		return (value & onClose) !== 0;
	}
}
export type DiagnosticPullModeFlags = number;


/**
 * @since 3.17.0 - proposed state
 */
export namespace DiagnosticTriggerKind {
	/**
	 * The request got triggered through some API
	 */
	export const Invoked: 1 = 1;

	/**
	 * The request got triggered because the content of the
	 * document.
	 */
	export const Opened: 2 = 2;

	/**
	 * The request got triggered because an UI element showing the
	 * document gained focus.
	 */
	export const FocusGained: 3 = 3;

	/**
	 * The request got triggered because an UI element showing the
	 * document lost focus.
	 */
	export const FocusLost: 4 = 4;

	/**
	 * The request got triggered because the content of the document
	 * got modified.
	 */
	export const Changed: 5 = 5;

	/**
	 * The request got triggered because the the content of the
	 * document got saved.
	 */
	export const Saved: 6 = 6;

	export const Closed: 7 = 7;

	export function is(value: any): value is DiagnosticTriggerKind {
		return Invoked <= value && value <= Saved;
	}
}
export type DiagnosticTriggerKind = 1 | 2 | 3 | 4 | 5 | 6 | 7;


/**
 * @since 3.17.0 - proposed state
 */
export interface DiagnosticContext {
	triggerKind: DiagnosticTriggerKind;
}

/**
 * @since 3.17.0 - proposed state
 */
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

/**
 * @since 3.17.0 - proposed state
 */
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

/**
 * @since 3.17.0 - proposed state
 */
export interface DiagnosticRegistrationOptions extends TextDocumentRegistrationOptions, DiagnosticOptions, StaticRegistrationOptions {
}

export interface $DiagnosticServerCapabilities {
	diagnosticProvider?: boolean | DiagnosticOptions;
}

/**
 * @since 3.17.0 - proposed state
 */
export interface DiagnosticServerCancellationData {
	retriggerRequest: boolean;
}

/**
 * @since 3.17.0 - proposed state
 */
export namespace DiagnosticServerCancellationData {
	export function is(value: any): value is DiagnosticServerCancellationData {
		const candidate = value as DiagnosticServerCancellationData;
		return candidate && Is.boolean(candidate.retriggerRequest);
	}
}

/**
 * The result of a diagnostic pull request.
 *
 * @since 3.17.0 - proposed state
 */
export interface DiagnosticList {
	items: Diagnostic[];
}

/**
 * @since 3.17.0 - proposed state
 */
export namespace DiagnosticRequest {
	export const method: 'textDocument/diagnostic' = 'textDocument/diagnostic';
	export const type = new ProtocolRequestType<DiagnosticParams, DiagnosticList, Diagnostic[], DiagnosticServerCancellationData, DiagnosticRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<DiagnosticParams, DiagnosticList | null, void>;
}

/**
 * @since 3.17.0 - proposed state
 */
export namespace DiagnosticRefreshRequest {
	export const method: `workspace/diagnostic/refresh` = `workspace/diagnostic/refresh`;
	export const type = new ProtocolRequestType0<void, void, void, void>(method);
	export type HandlerSignature = RequestHandler0<void, void>;
}