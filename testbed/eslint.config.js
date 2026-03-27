// @ts-check
'use strict';

const { createConfig } = require('../eslint.config.base.js');

module.exports = createConfig(
	['./tsconfig.json', './client/tsconfig.json', './server/tsconfig.json'],
	undefined,
	{
		'no-console': 'off',
	}
);
