// @ts-check
'use strict';

const { createConfig } = require('../eslint.config.base.js');

module.exports = createConfig(
	['src/browser/tsconfig.json', 'src/browser/test/tsconfig.json', 'src/common/tsconfig.json', 'src/common/test/tsconfig.json', 'src/node/tsconfig.json', 'src/node/test/tsconfig.json'],
	['dist/**'],
	{
		'no-console': 'error',
	}
);
