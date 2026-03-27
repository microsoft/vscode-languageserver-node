// @ts-check
'use strict';

const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const stylistic = require('@stylistic/eslint-plugin');
const globals = require('globals');

/**
 * Creates an ESLint flat config array for a TypeScript package.
 *
 * @param {string[]} projects - tsconfig project paths (relative to the package root)
 * @param {string[]} [ignores] - additional paths/globs to ignore
 * @param {Record<string, unknown>} [extraRules] - package-specific rule overrides
 * @returns {import('eslint').Linter.Config[]}
 */
function createConfig(projects, ignores, extraRules) {
	/** @type {import('eslint').Linter.Config[]} */
	const config = [
		{
			ignores: ['lib/**', 'dist/**', 'node_modules/**', ...(ignores ?? [])],
		},
		{
			files: ['**/*.ts'],
			languageOptions: {
				parser: tsParser,
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					project: projects,
					tsconfigRootDir: process.cwd(),
				},
				globals: {
					...globals.node,
				},
			},
			plugins: {
				'@typescript-eslint': tseslint,
				'@stylistic': stylistic,
			},
			rules: {
				'@stylistic/semi': 'error',
				'@stylistic/member-delimiter-style': ['error', {
					multiline: { delimiter: 'semi', requireLast: true },
					singleline: { delimiter: 'semi', requireLast: false },
					multilineDetection: 'brackets',
				}],
				'@stylistic/indent': ['warn', 'tab', { SwitchCase: 1 }],
				'@stylistic/no-extra-semi': 'warn',
				'@stylistic/quotes': ['error', 'single', { allowTemplateLiterals: true }],
				'@typescript-eslint/no-floating-promises': 'error',
				'curly': 'warn',
				'eqeqeq': 'error',
				'constructor-super': 'warn',
				'prefer-const': ['warn', { destructuring: 'all' }],
				'no-caller': 'warn',
				'no-case-declarations': 'warn',
				'no-debugger': 'warn',
				'no-duplicate-case': 'warn',
				'no-duplicate-imports': 'warn',
				'no-eval': 'warn',
				'no-async-promise-executor': 'warn',
				'no-new-wrappers': 'warn',
				'no-redeclare': 'off',
				'no-sparse-arrays': 'warn',
				'no-throw-literal': 'warn',
				'no-unsafe-finally': 'warn',
				'no-unused-labels': 'warn',
				'no-restricted-globals': ['warn', 'name', 'length', 'event', 'closed', 'external', 'status', 'origin', 'orientation', 'context'],
				'no-var': 'warn',
				'@typescript-eslint/naming-convention': ['warn', {
					selector: 'class',
					format: ['PascalCase'],
					leadingUnderscore: 'allow',
				}],
				...extraRules,
			},
		},
	];
	return config;
}

module.exports = { createConfig };
