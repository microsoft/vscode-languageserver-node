// @ts-check
'use strict';

const { createConfig } = require('../eslint.config.base.js');

module.exports = createConfig(
	['./tsconfig.json'],
	undefined,
	{
		'no-console': 'off',
	}
);
