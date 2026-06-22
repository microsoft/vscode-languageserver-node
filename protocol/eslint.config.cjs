// @ts-check
'use strict';

const { createConfig } = require('../eslint.config.base.js');

module.exports = createConfig(
	['src/common/tsconfig.json', 'src/browser/tsconfig.json', 'src/browser/test/tsconfig.json', 'src/node/tsconfig.json', 'src/node/test/tsconfig.json'],
	undefined,
	{
		'no-console': 'error',
		'@typescript-eslint/no-floating-promises': 'error',
	}
);
