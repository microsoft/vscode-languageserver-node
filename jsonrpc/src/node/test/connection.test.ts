/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';

import { Duplex  } from 'stream';
import { inherits } from 'util';
import { AsyncLocalStorage } from 'async_hooks';

import { CancellationTokenSource, RequestType, RequestType3, ResponseError, NotificationType, NotificationType2, ErrorCodes } from '../main';

import * as hostConnection from '../main';
import { getCustomCancellationStrategy } from './customCancellationStrategy';
import { ParameterStructures } from '../../common/messages';
import { MessageChannel } from 'worker_threads';

interface TestDuplex extends Duplex {
}

interface TestDuplexConstructor {
	new (name?: string, dbg?: boolean): TestDuplex;
}

const TestDuplex: TestDuplexConstructor = function (): TestDuplexConstructor {
	function TestDuplex(this: any, name: string = 'ds1', dbg = false) {
		Duplex.call(this);
		this.name = name;
		this.dbg = dbg;
	}
	inherits(TestDuplex, Duplex);
	TestDuplex.prototype._write = function (this: any, chunk: string | Buffer, _encoding: string, done: Function) {
		// eslint-disable-next-line no-console
		if (this.dbg) { console.log(this.name + ': write: ' + chunk.toString()); }
		setImmediate(() => {
			this.emit('data', chunk);
		});
		done();
	};
	TestDuplex.prototype._read = function (this: any, _size: number) {
	};
	return (<any>TestDuplex) as TestDuplexConstructor;
} ();

suite('Connection', () => {

	test('Test Duplex Stream', (done) => {
		const stream = new TestDuplex('ds1');
		stream.on('data', (chunk) => {
			assert.strictEqual('Hello World', chunk.toString());
			done();
		});
		stream.write('Hello World');
	});

	test('Test Duplex Stream Connection', (done) => {
		const type = new RequestType<string, string, void>('test/handleSingleRequest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const connection = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		connection.listen();
		let counter = 0;
		let content: string = '';
		duplexStream2.on('data', (chunk) => {
			content += chunk.toString();
			if (++counter === 2) {
				assert.strictEqual(content.indexOf('Content-Length: 77'), 0);
				done();
			}
		});
		void connection.sendRequest(type, 'foo');
	});

	test('Primitive param as positional', (done) => {
		const type = new RequestType<boolean, number, void>('test/handleSingleRequest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const connection = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		connection.listen();
		let counter = 0;
		let content: string = '';
		duplexStream2.on('data', (chunk) => {
			content += chunk.toString();
			if (++counter === 2) {
				assert.ok(content.indexOf('"params":[true]') !== -1);
				done();
			}
		});
		void connection.sendRequest(type, true);
	});

	test('Array param as positional', (done) => {
		const type = new RequestType<boolean[], number, void>('test/handleSingleRequest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const connection = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		connection.listen();
		let counter = 0;
		let content: string = '';
		duplexStream2.on('data', (chunk) => {
			content += chunk.toString();
			if (++counter === 2) {
				assert.ok(content.indexOf('"params":[[true]]') !== -1);
				done();
			}
		});
		void connection.sendRequest(type, [true]);
	});

	test('Literal param as named', (done) => {
		const type = new RequestType<{ value: boolean }, number, void>('test/handleSingleRequest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const connection = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		connection.listen();
		let counter = 0;
		let content: string = '';
		duplexStream2.on('data', (chunk) => {
			content += chunk.toString();
			if (++counter === 2) {
				assert.ok(content.indexOf('"params":{"value":true}') !== -1);
				done();
			}
		});
		void connection.sendRequest(type, { value: true });
	});

	test('Literal param as positional', (done) => {
		const type = new RequestType<{ value: boolean }, number, void>('test/handleSingleRequest', ParameterStructures.byPosition);
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const connection = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		connection.listen();
		let counter = 0;
		let content: string = '';
		duplexStream2.on('data', (chunk) => {
			content += chunk.toString();
			if (++counter === 2) {
				assert.ok(content.indexOf('"params":[{"value":true}]') !== -1);
				done();
			}
		});
		void connection.sendRequest(type, { value: true });
	});

	test('Handle Single Request', (done) => {
		const type = new RequestType<string, string, void>('test/handleSingleRequest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, (p1, _token) => {
			assert.strictEqual(p1, 'foo');
			return p1;
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		void client.sendRequest(type, 'foo').then((result) => {
			assert.strictEqual(result, 'foo');
			done();
		});
	});

	test('Handle Multiple Requests', (done) => {
		const type = new RequestType<string, string, void>('test/handleSingleRequest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, (p1, _token) => {
			return p1;
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		const promises: Promise<string>[] = [];
		promises.push(client.sendRequest(type, 'foo'));
		promises.push(client.sendRequest(type, 'bar'));

		void Promise.all(promises).then((values) => {
			assert.strictEqual(values.length, 2);
			assert.strictEqual(values[0], 'foo');
			assert.strictEqual(values[1], 'bar');
			done();
		});
	});


	test('Unhandled Request', (done) => {
		const type = new RequestType<string, string, void>('test/handleSingleRequest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		client.sendRequest(type, 'foo').then((_result) => {
		}, (error: ResponseError<any>) => {
			assert.strictEqual(error.code, ErrorCodes.MethodNotFound);
			done();
		});
	});

	test('Receives undefined param as null', (done) => {
		const type = new RequestType<string | null, string, void>('test/handleSingleRequest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, (param) => {
			assert.strictEqual(param, null);
			return '';
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		void client.sendRequest(type, undefined).then((_result) => {
			done();
		});
	});

	test('Receives null as null', (done) => {
		const type = new RequestType<string | null, string | null, void>('test/handleSingleRequest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, (param) => {
			assert.strictEqual(param, null);
			return null;
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		void client.sendRequest(type, null).then(result => {
			assert.deepEqual(result, null);
			done();
		});
	});

	test('Receives 0 as 0', (done) => {
 		const type = new RequestType<number, number, void>('test/handleSingleRequest');
 		const duplexStream1 = new TestDuplex('ds1');
 		const duplexStream2 = new TestDuplex('ds2');

 		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
 		server.onRequest(type, (param) => {
 			assert.strictEqual(param, 0);
 			return 0;
 		});
 		server.listen();

 		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
 		client.listen();
 		void client.sendRequest(type, 0).then(result => {
 			assert.deepEqual(result, 0);
 			done();
 		});
 	});

	const testNotification = new NotificationType<{ value: boolean }>('testNotification');
	test('Send and Receive Notification', (done) => {

		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onNotification(testNotification, (param) => {
			assert.strictEqual(param.value, true);
			done();
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		void client.sendNotification(testNotification, { value: true });
	});

	test('Unhandled notification event', (done) => {
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onUnhandledNotification((message) => {
			assert.strictEqual(message.method, testNotification.method);
			done();
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		void client.sendNotification(testNotification, { value: true });
	});

	test('Dispose connection', (done) => {
		const type = new RequestType<string | null, string | null, void>('test/handleSingleRequest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, (_param) => {
			client.dispose();
			return '';
		});
		server.listen();

		client.listen();
		client.sendRequest(type, '').then(_result => {
			assert.ok(false);
		}, () => {
			done();
		});
	});

	test('Disposed connection throws', (done) => {
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		client.dispose();
		try {
			void client.sendNotification(testNotification);
			assert.ok(false);
		} catch (error) {
			done();
		}
	});

	test('Two listen throw', (done) => {
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		try {
			client.listen();
			assert.ok(false);
		} catch (error) {
			done();
		}
	});

	test('Notify on connection dispose', (done) => {
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		client.onDispose(() => {
			done();
		});
		client.dispose();
	});

	test('N params in notifications', (done) => {
		const type = new NotificationType2<number, string>('test');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onNotification(type, (p1, p2) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 'vscode');
			done();
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		void client.sendNotification(type, 10, 'vscode');
	});

	test('N params in request / response', (done) => {
		const type = new RequestType3<number, number, number, number, void>('add');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, (p1, p2, p3) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, 30);
			return p1 + p2 + p3;
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		client.sendRequest(type, 10, 20, 30).then(result => {
			assert.strictEqual(result, 60);
			done();
		}, () => {
			assert.ok(false);
			done();
		});
	});

	test('N params in request / response with token', (done) => {
		const type = new RequestType3<number, number, number, number, void>('add');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, (p1, p2, p3, _token) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, 30);
			return p1 + p2 + p3;
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		const token = new CancellationTokenSource().token;
		client.listen();
		client.sendRequest(type, 10, 20, 30, token).then(result => {
			assert.strictEqual(result, 60);
			done();
		}, () => {
			assert.ok(false);
			done();
		});
	});

	test('One Param as array in request', (done) => {
		const type = new RequestType<number[], number, void>('add', ParameterStructures.byPosition);
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, (p1) => {
			assert.ok(Array.isArray(p1));
			assert.strictEqual(p1[0], 10);
			assert.strictEqual(p1[1], 20);
			assert.strictEqual(p1[2], 30);
			return 60;
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		const token = new CancellationTokenSource().token;
		client.listen();
		client.sendRequest(type, [10, 20, 30], token).then(result => {
			assert.strictEqual(result, 60);
			done();
		}, () => {
			assert.ok(false);
		});
	});

	test('One Param as array in notification', (done) => {
		const type = new NotificationType<number[]>('add', ParameterStructures.byPosition);
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onNotification(type, (p1) => {
			assert.ok(Array.isArray(p1));
			assert.strictEqual(p1[0], 10);
			assert.strictEqual(p1[1], 20);
			assert.strictEqual(p1[2], 30);
			done();
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		void client.sendNotification(type, [10, 20, 30]);
	});

	test('Untyped request / response', (done) => {
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest('test', (p1, p2, p3, _token) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, 30);
			return p1 + p2 + p3;
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		const token = new CancellationTokenSource().token;
		client.listen();
		client.sendRequest('test', 10, 20, 30, token).then((result) => {
			assert.strictEqual(result, 60);
			done();
		}, () => {
			assert.ok(false);
		});
	});

	test('Untyped request / response with parameter structure', (done) => {
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest('test', (p1, _token) => {
			assert.strictEqual(p1.value, 10);
			return p1.value;
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		const token = new CancellationTokenSource().token;
		client.listen();
		client.sendRequest('test', ParameterStructures.byPosition, { value: 10 }, token).then((result) => {
			assert.strictEqual(result, 10);
			done();
		}, () => {
			assert.ok(false);
		});
	});

	test('Cancellation token is undefined', (done) => {
		const type = new RequestType3<number, number, number, number, void>('add');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, (p1, p2, p3, _token) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, 30);
			return p1 + p2 + p3;
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		client.sendRequest(type, 10, 20, 30, undefined).then(result => {
			assert.strictEqual(result, 60);
			done();
		}, () => {
			assert.ok(false);
		});
	});

	test('Missing params in request', (done) => {
		const type = new RequestType3<number, number, number, number, void>('add');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, (p1, p2, p3, _token) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, null);
			return p1 + p2;
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		(client.sendRequest as Function)(type, 10, 20).then((result: any) => {
			assert.strictEqual(result, 30);
			done();
		}, () => {
			assert.ok(false);
		});
	});

	test('Missing params in notifications', (done) => {
		const type = new NotificationType2<number, string>('test');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onNotification(type, (p1, p2) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, null);
			done();
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		(client.sendNotification as Function)(type, 10);
	});

	test('Regular Cancellation', (done) => {
		const type = new hostConnection.RequestType0<void, void>('cancelTest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		function delay(ms: number) {
			return new Promise(resolve => setTimeout(resolve, ms));
		}

		const source = new CancellationTokenSource();
		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, async t => {

			while (!t.isCancellationRequested) {
				// regular cancellation requires async for it to work
				await delay(0);
			}

			done();
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		void client.sendRequest(type, source.token);
		source.cancel();
	});

	test('Already cancelled token', (done) => {
		const type = new hostConnection.RequestType0<void, void>('cancelTest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		function delay(ms: number) {
			return new Promise(resolve => setTimeout(resolve, ms));
		}

		const source = new CancellationTokenSource();
		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		server.onRequest(type, async t => {

			while (!t.isCancellationRequested) {
				// regular cancellation requires async for it to work
				await delay(0);
			}

			done();
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		source.cancel();
		void client.sendRequest(type, source.token);
	});

	test('Custom Cancellation', (done) => {
		const type = new hostConnection.RequestType0<void, void>('cancelTest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const source = new CancellationTokenSource();
		const strategy = getCustomCancellationStrategy();
		const options = { cancellationStrategy: strategy };

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger, options);
		server.onRequest(type, t => {

			while (!t.isCancellationRequested) {
				// custom cancellation that doesn't require async to work
			}

			strategy.dispose();
			done();
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger, options);
		client.listen();
		void client.sendRequest(type, source.token);
		source.cancel();
	});

	test('Uses custom message handler', (done) => {
		const type = new RequestType<number, number | null, void>('test/handleSingleRequest');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const asyncLocalStorage = new AsyncLocalStorage<number>();

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger, {
			messageStrategy: {
				handleMessage(message, next) {
					void asyncLocalStorage.run(1, () => next(message));
				}
			}
		});
		server.onRequest(type, (_p1, _token) => {
			return asyncLocalStorage.getStore();
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		void client.sendRequest(type, 0).then((res) => {
			assert.strictEqual(res, 1);
			done();
		});
	});

	test('Message ports', async () => {
		const type = new RequestType<string, string, void>('test/handleSingleRequest');
		const messageChannel = new MessageChannel();
		const clientPort = messageChannel.port1;
		const serverPort = messageChannel.port2;
		const server = hostConnection.createMessageConnection(new hostConnection.PortMessageReader(serverPort), new hostConnection.PortMessageWriter(serverPort));
		server.onRequest(type, (param) => {
			assert.strictEqual(param, 'foo');
			return param;
		});
		server.listen();

		const client = hostConnection.createMessageConnection(new hostConnection.PortMessageReader(clientPort), new hostConnection.PortMessageWriter(clientPort));
		client.listen();
		const result = await client.sendRequest(type, 'foo');
		assert.strictEqual(result, 'foo');
		clientPort.unref();
		serverPort.unref();
	});

	test('Parallelism - unlimited', async () => {
		const requestOne = new hostConnection.RequestType0<void, void>('test/parallelism_one');
		const requestTwo = new hostConnection.RequestType0<void, void>('test/parallelism_two');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
		const log: string[] = [];
		server.onRequest(requestOne, async () => {
			log.push('one-start');
			await new Promise(resolve => setTimeout(resolve, 100));
			log.push('one-end');
		});
		server.onRequest(requestTwo, async () => {
			log.push('two-start');
			log.push('two-end');
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
		client.listen();
		const r1 = client.sendRequest(requestOne);
		const r2 = client.sendRequest(requestTwo);
		await Promise.all([r1, r2]);
		assert.deepStrictEqual(log, ['one-start', 'two-start', 'two-end', 'one-end']);
	});

	test('Parallelism - limited', async () => {
		const requestOne = new hostConnection.RequestType0<void, void>('test/parallelism_one');
		const requestTwo = new hostConnection.RequestType0<void, void>('test/parallelism_two');
		const duplexStream1 = new TestDuplex('ds1');
		const duplexStream2 = new TestDuplex('ds2');

		const server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger, { maxParallelism: 1 });
		const log: string[] = [];
		server.onRequest(requestOne, async () => {
			log.push('one-start');
			await new Promise(resolve => setTimeout(resolve, 100));
			log.push('one-end');
		});
		server.onRequest(requestTwo, async () => {
			log.push('two-start');
			log.push('two-end');
		});
		server.listen();

		const client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger, { maxParallelism: 1 });
		client.listen();
		const r1 = client.sendRequest(requestOne);
		const r2 = client.sendRequest(requestTwo);
		await Promise.all([r1, r2]);
		assert.deepStrictEqual(log, ['one-start', 'one-end', 'two-start', 'two-end']);
	});
});
