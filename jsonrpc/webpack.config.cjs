/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

'use strict';

module.exports = {
	context: __dirname,
	mode: 'none',
	target: 'webworker',
	resolve: {
		mainFields: ['module', 'main'],
		extensions: ['.js'] // support ts-files and js-files
	},
	entry: {
		extension: './lib/browser/main.js',
	},
	devtool: 'source-map',
	output: {
		filename: 'main.js'
	}
};