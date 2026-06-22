// @ts-check
'use strict';

const { createConfig } = require('../eslint.config.base.js');

module.exports = createConfig(
	['src/browser/tsconfig.json', 'src/common/tsconfig.json', 'src/node/tsconfig.json'],
	undefined,
	{}
);
