/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function updateNextTag() {

	// read package.json from the current working directory
	var packageJSON = JSON.parse(fs.readFileSync('package.json').toString());
	var name = packageJSON.name;
	var version = packageJSON.version;
	if (version.indexOf('next') !== -1) {
		return;
	}

	opts = {};
	opts.stdio = 'inherit';

	console.log(name + ": set 'next' tag to latest version");

	const result = cp.spawnSync(npm, ['dist-tags', 'add', name + '@' + version, 'next'], opts);

	if (result.error || result.status !== 0) {
		process.exit(1);
	}
}

updateNextTag();

