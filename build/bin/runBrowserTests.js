/* eslint-disable no-console */
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
//@ts-check

const path = require('path');
const url = require('url');
const events = require('events');

const mocha = require('mocha');
const playwright = require('playwright');
const httpServer = require('http-server');

class EchoRunner extends events.EventEmitter {

	constructor(event, title = '') {
		super();
		event.on('start', () => this.emit('start'));
		event.on('end', () => this.emit('end'));
		event.on('suite', (suite) => this.emit('suite', EchoRunner.deserializeSuite(suite, title)));
		event.on('suite end', (suite) => this.emit('suite end', EchoRunner.deserializeSuite(suite, title)));
		event.on('test', (test) => this.emit('test', EchoRunner.deserializeRunnable(test)));
		event.on('test end', (test) => this.emit('test end', EchoRunner.deserializeRunnable(test)));
		event.on('hook', (hook) => this.emit('hook', EchoRunner.deserializeRunnable(hook)));
		event.on('hook end', (hook) => this.emit('hook end', EchoRunner.deserializeRunnable(hook)));
		event.on('pass', (test) => this.emit('pass', EchoRunner.deserializeRunnable(test)));
		event.on('fail', (test, err) => this.emit('fail', EchoRunner.deserializeRunnable(test, title), EchoRunner.deserializeError(err)));
		event.on('pending', (test) => this.emit('pending', EchoRunner.deserializeRunnable(test)));
	}

	static deserializeSuite(suite, titleExtra) {
		return {
			root: suite.root,
			suites: suite.suites,
			tests: suite.tests,
			title: titleExtra && suite.title ? `${suite.title} - /${titleExtra}/` : suite.title,
			fullTitle: () => suite.fullTitle,
			timeout: () => suite.timeout,
			retries: () => suite.retries,
			enableTimeouts: () => suite.enableTimeouts,
			slow: () => suite.slow,
			bail: () => suite.bail
		};
	}

	static deserializeRunnable(runnable, titleExtra) {
		return {
			title: runnable.title,
			fullTitle: () => titleExtra && runnable.fullTitle ? `${runnable.fullTitle} - /${titleExtra}/` : runnable.fullTitle,
			async: runnable.async,
			slow: () => runnable.slow,
			speed: runnable.speed,
			duration: runnable.duration
		};
	}

	static deserializeError(err) {
		const inspect = err.inspect;
		err.inspect = () => inspect;
		return err;
	}
}


async function runTests(location) {
	return new Promise((resolve, reject) => {
		const root = path.join(__dirname, '..', '..');
		const server = httpServer.createServer({
			root: root, showDir: true,
			cors: true,
			headers: {
				'Cross-Origin-Opener-Policy': 'same-origin',
				'Cross-Origin-Embedder-Policy': 'require-corp'
			}
		});
		server.listen(8080, '127.0.0.1', async () => {
			let failCount = 0;
			const browser = await playwright['chromium'].launch({ headless: false, devtools: true });
			const context = await browser.newContext();
			const page = await context.newPage();
			const emitter = new events.EventEmitter();
			emitter.on('fail', () => {
				failCount++;
			});
			emitter.on('end', async () => {
				process.exitCode = failCount === 0 ? 0 : 1;
				await browser.close();
				server.close((err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
			const echoRunner = new EchoRunner(emitter, 'Chromium');
			if (process.platform === 'win32') {
				new mocha.reporters.List(echoRunner);
			} else {
				new mocha.reporters.Spec(echoRunner);
			}
			await page.exposeFunction('mocha_report', (type, data1, data2) => {
				emitter.emit(type, data1, data2);
			});

			const target = new url.URL(location);
			page.goto(target.href);
		});
	});
}

runTests(process.argv[2]);