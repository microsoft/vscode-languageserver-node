/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

export * from './types';

import { Projects } from './types';
import { ProjectGenerator } from './generator';

const projects: Projects = require('../../.tsconfigrc');

function main() {
	for (const project of projects) {
		const generator = new ProjectGenerator(project[0], project[1][0]);
		console.log(generator.generate('.'));
	}
}

if (require.main === module) {
	main();
}