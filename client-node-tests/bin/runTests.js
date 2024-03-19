let path = require('path');

process.env.CODE_TESTS_PATH = path.join(process.cwd(), 'lib');
process.env.CODE_EXTENSIONS_PATH = path.join(process.cwd());

// Run the actual tests
require('vscode/bin/test');
