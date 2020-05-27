/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

const path = require('path');
const url = require('url');
const playwright = require('playwright');

async function runTests() {
	const browser = await playwright['chromium'].launch({ headless: false });
	const context = await browser.newContext();
	const page = await context.newPage();
	const target = url.pathToFileURL(path.join(__dirname, 'renderer.html'));

	await page.goto(target.href);
	await page.close();

	return Promise.resolve();
}

// eslint-disable-next-line no-console
runTests().then(undefined, console.error);