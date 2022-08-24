/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

'use strict';

const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = [{
	context: __dirname,
	mode: 'none',
	target: 'node',
	plugins: [
		new NodePolyfillPlugin()
	],
	resolve: {
		mainFields: ['module', 'main'],
		extensions: ['.js']
	},
	entry: {
		extension: '../../../lib/jshost/test/test.js',
	},
	devtool: 'source-map',
	output: {
		filename: 'tests.jshost.js'
	}
}];