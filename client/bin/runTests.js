let path = require('path');

process.env.CODE_TESTS_PATH = path.join(process.cwd(), 'lib', 'test');

// Run the actual tests
require('vscode/bin/test');