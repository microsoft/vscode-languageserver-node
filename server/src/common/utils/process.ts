/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

type CliOptValue = string | number | boolean | undefined;
/**
 * Parses an array of command-line opts into a map of key-value pairs.
 *
 * This currently supports args in the formats:
 *
 * ```
 * --key=value
 * --key value
 * --key
 * ```
 *
 * Example:
 * ```
 * parseCliOpts(['positionalArg', '--enable-logging', '--log-level=info']);
 * // Result: { 'enable-logging': undefined, 'log-level': 'info' }
 * ```
 *
 * @param opts - An array of command-line arguments.
 * @returns A map of key-value pairs parsed from the arguments. Leading '--' are removed from the
 *          keys of the final result.
 */
export function parseCliOpts(opts: string[]): { [key: string]: CliOptValue } {
	const result: { [key: string]: CliOptValue } = {};

	for (let i = 0; i < opts.length; i++) {
		const arg = opts[i];

		// Check if argument starts with --
		if (arg.startsWith('--')) {
			const key = arg.slice(2); // Remove --

			// Handle '--key=value' format
			if (key.includes('=')) {
				const [actualKey, value] = key.split('=');
				result[actualKey] = tryParseValue(value);
				continue;
			}

			// Handle '--key value' format or '--key' (flag without value)
			const nextArg = opts[i + 1];
			if (nextArg && !nextArg.startsWith('--')) {
				result[key] = tryParseValue(nextArg);
				i++; // Skip the next argument since we used it as a value
			} else {
				result[key] = undefined;
			}
		}
	}

	return result;

	/** Attempts to parse the string value in to its primitive  */
	function tryParseValue(value: string): Exclude<CliOptValue, 'undefined'> {
		const valueNormalized = value.toLowerCase();
		if (valueNormalized === 'true') {
			return true;
		}
		if (valueNormalized === 'false') {
			return false;
		}
		const num = Number(value);
		if (!isNaN(num)) {
			return num;
		}
		return value;
	}
}
