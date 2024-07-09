/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as minimatch from 'minimatch';

import { Uri } from 'vscode';
import type { GlobPattern } from 'vscode-languageserver-protocol';

export function matchGlobPattern(pattern: GlobPattern, resource: Uri): boolean {
	let miniMatchPattern: string;
	if (typeof pattern === 'string') {
		miniMatchPattern = pattern.replace(/\\/g, '/');
	} else {
		try {
			const baseUri = Uri.parse(typeof pattern.baseUri === 'string' ? pattern.baseUri : pattern.baseUri.uri);
			miniMatchPattern = baseUri.with({ path: baseUri.path + '/' + pattern.pattern }).fsPath.replace(/\\/g, '/');
		} catch (error) {
			return false;
		}
	}
	const matcher = new minimatch.Minimatch(miniMatchPattern, { noext: true });
	if (!matcher.makeRe()) {
		return false;
	}
	return matcher.match(resource.fsPath);
}