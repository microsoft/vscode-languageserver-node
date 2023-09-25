const path = require('path');
const fs = require('fs');

const packageJSON = require('../package.json');
const engineVersion = packageJSON.engines.vscode;

if (!engineVersion) {
	throw new Error(`'engines.vscode' not set in package.json`);
}

const regexp = /const REQUIRED_VSCODE_VERSION = '([^\']+)';/;

const mainPath = path.join(__dirname, '../src/node/main.ts');
const mainSource = fs.readFileSync(mainPath).toString();
const match = mainSource.match(regexp);
if (!match && match[1]) {
	throw new Error(`Unable to find 'const REQUIRED_VSCODE_VERSION' in main.ts`);
}
if (match[1] !== engineVersion) {
	console.log(`Updating REQUIRED_VSCODE_VERSION in main.ts to ${engineVersion}`);
	const updatedSource = mainSource.replace(regexp, `const REQUIRED_VSCODE_VERSION = '${engineVersion}';`);
	fs.writeFileSync(mainPath, updatedSource);
} else {
	console.log(`No change needed: REQUIRED_VSCODE_VERSION in main.ts is already ${engineVersion}`);
}
