/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { Duplex  } from 'stream';
import { inherits } from 'util';

import { RequestType, RequestType3, ResponseError, NotificationType, NotificationType2, ErrorCodes } from '../messages';
import { CancellationTokenSource } from '../cancellation';

import * as hostConnection from '../main';

interface TestDuplex extends Duplex {
}

interface TestDuplexConstructor {
	new (name?: string, dbg?: boolean): TestDuplex;
}

let TestDuplex: TestDuplexConstructor = function (): TestDuplexConstructor {
	function TestDuplex(this: any, name: string = 'ds1', dbg = false) {
		Duplex.call(this);
		this.name = name;
		this.dbg = dbg;
	}
	inherits(TestDuplex, Duplex);
	TestDuplex.prototype._write = function (this: any, chunk: string | Buffer, _encoding: string, done: Function) {
		if (this.dbg) console.log(this.name + ': write: ' + chunk.toString());
		setImmediate(() => {
			this.emit('data', chunk);
		});
		done();
	};
	TestDuplex.prototype._read = function (this: any, _size: number) {
	};
	return (<any>TestDuplex) as TestDuplexConstructor;
} ();

let Logger: hostConnection.Logger = {
	error: (_message: string) => { },
	warn: (_message: string) => { },
	info: (_message: string) => { },
	log: (_message: string) => { }
}

describe('Connection', () => {

	it('Test Duplex Stream', (done) => {
		let stream = new TestDuplex('ds1');
		stream.on('data', (chunk) => {
			assert.strictEqual('Hello World', chunk.toString());
			done();
		});
		stream.write('Hello World');
	});

	it('Test Duplex Stream Connection', (done) => {
		let type = new RequestType<string, string, void, void>('test/handleSingleRequest');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let connection = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		connection.listen();
		let counter = 0;
		let content: string = "";
        duplexStream2.on('data', (chunk) => {
			content += chunk.toString();
			if (++counter === 2) {
				assert.strictEqual(content.indexOf("Content-Length: 75"), 0);
				done();
			}
        });
		connection.sendRequest(type, 'foo');
	});

	it('Handle Single Request', (done) => {
		let type = new RequestType<string, string, void, void>('test/handleSingleRequest');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onRequest(type, (p1, _token) => {
			assert.strictEqual(p1, 'foo');
			return p1;
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.sendRequest(type, 'foo').then((result) => {
			assert.strictEqual(result, 'foo');
			done();
		});
	});

	it('Handle Multiple Requests', (done) => {
		let type = new RequestType<string, string, void, void>('test/handleSingleRequest');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onRequest(type, (p1, _token) => {
			return p1;
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		let promises: Thenable<string>[] = [];
		promises.push(client.sendRequest(type, 'foo'));
		promises.push(client.sendRequest(type, 'bar'));

		Promise.all(promises).then((values) => {
			assert.strictEqual(values.length, 2);
			assert.strictEqual(values[0], 'foo');
			assert.strictEqual(values[1], 'bar');
			done();
		});
	});


	it('Unhandled Request', (done) => {
		let type = new RequestType<string, string, void, void>('test/handleSingleRequest');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.sendRequest(type, 'foo').then((_result) => {
		}, (error: ResponseError<any>) => {
			assert.strictEqual(error.code, ErrorCodes.MethodNotFound);
			done();
		});
	});

	it('Receives undefined param as null', (done) => {
		let type = new RequestType<string, string, void, void>('test/handleSingleRequest');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onRequest(type, (param) => {
			assert.strictEqual(param, null);
			return '';
		})
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.sendRequest(type, undefined).then((_result) => {
			done();
		});
	});

	it('Receives null as null', (done) => {
		let type = new RequestType<string | null, string | null, void, void>('test/handleSingleRequest');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onRequest(type, (param) => {
			assert.strictEqual(param, null);
			return null;
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.sendRequest(type, null).then(result => {
			assert.deepEqual(result, null);
			done();
		});
	});

	it('Receives 0 as 0', (done) => {
 		let type = new RequestType<number, number, void, void>('test/handleSingleRequest');
 		let duplexStream1 = new TestDuplex('ds1');
 		let duplexStream2 = new TestDuplex('ds2');

 		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
 		server.onRequest(type, (param) => {
 			assert.strictEqual(param, 0);
 			return 0;
 		});
 		server.listen();

 		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
 		client.listen();
 		client.sendRequest(type, 0).then(result => {
 			assert.deepEqual(result, 0);
 			done();
 		});
 	});

	let testNotification = new NotificationType<{ value: boolean }, void>("testNotification");
	it('Send and Receive Notification', (done) => {

		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onNotification(testNotification, (param) => {
			assert.strictEqual(param.value, true);
			done();
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.sendNotification(testNotification, { value: true });
	});

	it('Unhandled notification event', (done) => {
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onUnhandledNotification((message) => {
			assert.strictEqual(message.method, testNotification.method);
			done();
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.sendNotification(testNotification, { value: true });
	});

	it('Dispose connection', (done) => {
		let type = new RequestType<string | null, string | null, void, void>('test/handleSingleRequest');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onRequest(type, (_param) => {
			client.dispose();
			return '';
		});
		server.listen();

		client.listen();
		client.sendRequest(type, '').then(_result => {
			assert(false);
		}, () => {
			done();
		});
	});

	it('Disposed connection throws', (done) => {
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.dispose();
		try {
			client.sendNotification(testNotification);
			assert(false);
		} catch (error) {
			done();
		}
	});

	it('Two listen throw', (done) => {
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		try {
			client.listen();
			assert(false);
		} catch (error) {
			done();
		}
	});

	it('Notify on connection dispose', (done) => {
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.onDispose(() => {
			done();
		});
		client.dispose();
	});

	it('N params in notifications', (done) => {
		let type = new NotificationType2<number, string, void>('test');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onNotification(type, (p1, p2) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 'vscode');
			done();
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.sendNotification(type, 10, 'vscode');
	});

	it('N params in request / response', (done) => {
		let type = new RequestType3<number, number, number, number, void, void>('add');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onRequest(type, (p1, p2, p3) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, 30);
			return p1 + p2 + p3;
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.sendRequest(type, 10, 20, 30).then(result => {
			assert.strictEqual(result, 60);
			done();
		}, () => {
			assert(false);
			done();
		});
	});

	it('N params in request / response with token', (done) => {
		let type = new RequestType3<number, number, number, number, void, void>('add');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onRequest(type, (p1, p2, p3, _token) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, 30);
			return p1 + p2 + p3;
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		let token = new CancellationTokenSource().token;
		client.listen();
		client.sendRequest(type, 10, 20, 30, token).then(result => {
			assert.strictEqual(result, 60);
			done();
		}, () => {
			assert(false);
			done();
		});
	});

	it('One Param as array in request', (done) => {
		let type = new RequestType<number[], number, void, void>('add');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onRequest(type, (p1) => {
			assert(Array.isArray(p1));
			assert.strictEqual(p1[0], 10);
			assert.strictEqual(p1[1], 20);
			assert.strictEqual(p1[2], 30);
			return 60;
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		let token = new CancellationTokenSource().token;
		client.listen();
		client.sendRequest(type, [10, 20, 30], token).then(result => {
			assert.strictEqual(result, 60);
			done();
		}, () => {
			assert(false);
			done();
		});
	});

	it('One Param as array in notification', (done) => {
		let type = new NotificationType<number[], void>('add');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onNotification(type, (p1) => {
			assert(Array.isArray(p1));
			assert.strictEqual(p1[0], 10);
			assert.strictEqual(p1[1], 20);
			assert.strictEqual(p1[2], 30);
			done();
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.sendNotification(type, [10, 20, 30]);
	});

	it('Untyped request / response', (done) => {
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onRequest('test', (p1, p2, p3, _token) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, 30);
			return p1 + p2 + p3;
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		let token = new CancellationTokenSource().token;
		client.listen();
		client.sendRequest('test', 10, 20, 30, token).then((result) => {
			assert.strictEqual(result, 60);
			done();
		}, () => {
			assert(false);
			done();
		});
	});

	it('Cancellation token is undefined', (done) => {
		let type = new RequestType3<number, number, number, number, void, void>('add');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onRequest(type, (p1, p2, p3, _token) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, 30);
			return p1 + p2 + p3;
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		client.sendRequest(type, 10, 20, 30, undefined).then(result => {
			assert.strictEqual(result, 60);
			done();
		}, () => {
			assert(false);
			done();
		});
	});

	it('Missing params in request', (done) => {
		let type = new RequestType3<number, number, number, number, void, void>('add');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onRequest(type, (p1, p2, p3, _token) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, null);
			return p1 + p2;
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		(client.sendRequest as Function)(type, 10, 20).then((result: any) => {
			assert.strictEqual(result, 30);
			done();
		}, () => {
			assert(false);
			done();
		});
	});

	it('Missing params in notifications', (done) => {
		let type = new NotificationType2<number, string, void>('test');
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		server.onNotification(type, (p1, p2) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, null);
			done();
		});
		server.listen();

		let client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		client.listen();
		(client.sendNotification as Function)(type, 10);
	});
});