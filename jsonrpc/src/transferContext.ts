/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Message, isRequestMessage } from './messages';

interface Named {
	name: string;
}

interface Keyed {
	has(value: string): boolean;
}

export class TransferContext {

	private static ACCEPT_ENCODING = 'Accept-Encoding';

	private state: Map<string | number, Map<string, string>>;
	private defaultNotificationEncodings: string[];
	private defaultRequestEncodings: string[];
	private defaultResponseEncodings: string[];
	private chachedResponseAcceptEncodings: { values: Named[], result: string[] } | undefined;

	constructor() {
		this.state = new Map();
		this.defaultNotificationEncodings = [];
		this.defaultRequestEncodings = [];
		this.defaultResponseEncodings = [];
	}

	public setDefaultNotificationEncodings(value: string): void {
		this.defaultNotificationEncodings = this.parseEncodings(value);
	}

	public setDefaultRequestEncodings(value: string): void {
		this.defaultRequestEncodings = this.parseEncodings(value);
	}

	public setDefaultResponseEncodings(value: string): void {
		this.defaultResponseEncodings = this.parseEncodings(value);
	}

	public capture(msg: Message, headers: Map<string, string>): void {
		if (!isRequestMessage(msg)) {
			return;
		}

		this.state.set(msg.id, headers);
	}

	public getNotificationContentEncoding(supportedEncoding: Keyed): string | undefined {
		if (this.defaultNotificationEncodings.length === 0) {
			return undefined;
		}
		for (const encoding of this.defaultNotificationEncodings) {
			if (supportedEncoding.has(encoding)) {
				return encoding;
			}
		}
		return undefined;
	}

	public getRequestContentEncoding(supportedEncoding: Keyed): string | undefined {
		if (this.defaultRequestEncodings.length === 0) {
			return undefined;
		}
		for (const encoding of this.defaultRequestEncodings) {
			if (supportedEncoding.has(encoding)) {
				return encoding;
			}
		}
		return undefined;
	}

	public getResponseAcceptEncodings(supportedEncodings: Named[]): string[] | undefined {
		if (supportedEncodings.length === 0) {
			return undefined;
		}
		if (this.chachedResponseAcceptEncodings !== undefined && this.chachedResponseAcceptEncodings.values === supportedEncodings) {
			return this.chachedResponseAcceptEncodings.result;
		}
		if (supportedEncodings.length === 1) {
			const result = [ supportedEncodings[0].name ];
			this.chachedResponseAcceptEncodings = { values: supportedEncodings, result };
			return result;
		}

		const distribute = supportedEncodings.length - 1;
		if (distribute > 1000) {
			throw new Error(`Quality value can only have three decimal digits but trying to distribute ${supportedEncodings.length} elements.`);
		}
		const digits =  Math.ceil(Math.log10(distribute));
		const factor = Math.pow(10,digits);
		const diff = Math.floor((1 / distribute) * factor) / factor;

		const result: string[] = [];
		let q = 1;
		for (const encoding of supportedEncodings) {
			result.push(`${encoding.name};q=${q === 1 || q === 0 ? q.toFixed(0) : q.toFixed(digits)}`);
			q = q - diff;
		}
		this.chachedResponseAcceptEncodings = { values: supportedEncodings, result };
		return result;
	}

	public getResponseContentEncoding(id: string | number | null, supportedEncodings: Keyed): string | undefined {
		if (this.defaultResponseEncodings.length > 0) {
			for (const encoding of this.defaultResponseEncodings) {
				if (supportedEncodings.has(encoding)) {
					return encoding;
				}
			}
		}
		if (id === null) {
			return undefined;
		}
		const headers = this.state.get(id);
		if (headers === undefined) {
			return undefined;
		}

		const acceptEncodings = headers.get(TransferContext.ACCEPT_ENCODING);
		if (acceptEncodings === undefined) {
			return undefined;
		}
		// Accept-Encoding: deflate, gzip;q=1.0, *;q=0.5
		const encodings = acceptEncodings.split(/\s*,\s*/);
		const result: { encoding: string | undefined; quality: number } = { encoding: undefined, quality: -1 };
		for (const value of encodings) {
			const [encoding, q] = this.parseEncoding(value);
			if (encoding !== '*' && supportedEncodings.has(encoding) && q > result.quality) {
				result.encoding = encoding;
				result.quality = q;
			}
		}
		return result.encoding;
	}

	private parseEncodings(value: string): string[] {
		const map: Map<number, string[]> = new Map();
		const encodings = value.split(/\s*,\s*/);
		for (const value of encodings) {
			const [encoding, q] = this.parseEncoding(value);
			if (encoding === '*') {
				continue;
			}
			let values = map.get(q);
			if (values === undefined) {
				values = [];
				map.set(q, values);
			}
			values.push(encoding);
		}
		const keys = Array.from(map.keys());
		keys.sort((a, b) => b - a);
		const result: string[] = [];
		for (const key of keys) {
			result.push(...map.get(key)!);
		}
		return result;
	}

	private parseEncoding(value: string): [string, number] {
		let q: number = 1;
		let encoding: string;
		const index = value.indexOf(';q=');
		if (index !== -1) {
			const parsed = parseFloat(value.substr(index));
			if (parsed !== NaN) {
				q = parsed;
			}
			encoding = value.substr(0, index);
		} else {
			encoding = value;
		}
		return [encoding, q];
	}
}