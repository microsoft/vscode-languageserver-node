// @ts-check
'use strict';

const { createConfig } = require('../eslint.config.base.js');

module.exports = createConfig(
	['src/tsconfig.json', 'src/test/tsconfig.json'],
	undefined,
	{
		'no-console': 'error',
		'@typescript-eslint/no-floating-promises': 'error',
	}
);
