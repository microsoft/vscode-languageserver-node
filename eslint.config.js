// @ts-check
'use strict';

const stylistic = require('@stylistic/eslint-plugin');
const globals = require('globals');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
	{
		ignores: ['node_modules/**', 'lib/**', '**/.tsconfigrc.js'],
	},
	{
		files: ['**/*.js'],
		plugins: {
			'@stylistic': stylistic,
		},
		languageOptions: {
			ecmaVersion: 2020,
			globals: {
				...globals.commonjs,
				...globals.es2015,
			},
		},
		rules: {
			'@stylistic/semi': 'error',
			'@stylistic/no-extra-semi': 'warn',
			'curly': 'warn',
			'@stylistic/quotes': ['error', 'single', { allowTemplateLiterals: true }],
			'eqeqeq': 'error',
			'@stylistic/indent': ['warn', 'tab', { SwitchCase: 1 }],
		},
	},
];
