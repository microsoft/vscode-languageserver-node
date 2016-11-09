/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { Duplex, Writable, Readable, Transform } from 'stream';
import { inherits } from 'util';

import { Message, RequestMessage, RequestType, RequestType3, ResponseMessage, ResponseError, NotificationType, NotificationType2, isReponseMessage, ErrorCodes } from '../messages';
import { StreamMessageWriter } from '../messageWriter';
import { StreamMessageReader } from '../messageReader';
import { CancellationTokenSource } from '../cancellation';

import * as hostConnection from '../main';

function TestWritable() {
	Writable.call(this);
	this.data = '';
}
inherits(TestWritable, Writable);
TestWritable.prototype._write = function (chunk, encoding, done) {
	this.data += chunk.toString();
	done();
}

function TestDuplex(name: string = 'ds1', dbg = false) {
	Duplex.call(this);
	this.data = '';
	this.name = name;
	this.dbg = dbg;
    this.on('finish', function() {
		this.isWriteFinished = true;
		this.emit('readable');
    });
}
inherits(TestDuplex, Duplex);
TestDuplex.prototype._write = function (chunk, encoding, done) {
	let val = chunk.toString();
	this.data += val;
	if (this.dbg) console.log(this.name + ': write: ' + val);
	this.emit('readable');
	done();
}

TestDuplex.prototype._read = function(size) {
	if (size > this.data.length) {
		size = this.data.length;
	}
	let val = this.data.substring(0, size);
	if (this.dbg) console.log(this.name + ': read: ' + val);
	this.push(val);
	this.data = this.data.substring(size);

	if (this.isWriteFinished && this.data.length === 0) {
		this.push(null);
		this.isWriteFinished = false;
	}
}

function newRequestString(id: number, method: string, params: any) : string {
	let request : RequestMessage = { jsonrpc: '2.0', id, method, params };
	let str = JSON.stringify(request);
	return `Content-Length: ${str.length}\r\n\r\n${str}`;
}

function selectProperties(properties: string[]) {
	return (obj) => {
		let res= {};
		properties.forEach(p => {
			res[p] = obj[p];
		});
		return res;
	}
}


function assertMessages(resultData: string, expected: Message[], done: MochaDone) {
	let resultStream = new Readable();
	resultStream.push(resultData);
	resultStream.push(null);
	let actual : Message[] = [];
	new StreamMessageReader(resultStream).listen((res) => {
		if ((<ResponseMessage>res).error) {
			delete (<ResponseMessage>res).error.message;
		}
		actual.push(res);
	});
	setTimeout(() => {
		try {
			assert.deepEqual(actual, expected);
			done();
		} catch (e) {
			done(e);
		}
	}, 10);
}

let testRequest1: RequestType<any, any, any, void> = { method: 'testCommand1', _: undefined };
let testRequest2: RequestType<any, any, any, void> = { method: 'testCommand2', _: undefined };
function newParams(content: string)  {
	return { documents: [ { content: content } ]};
};

function testRequestHandler(params: any) : any | ResponseError<void> {
	if (params.documents && params.documents.length === 1 && params.documents[0].content) {
		return params.documents[0].content;
	} else {
		return new ResponseError<void>(ErrorCodes.InvalidRequest, "invalid");
	}
};


function createEventHandler<T>(result: T[]) : hostConnection.NotificationHandler<T> {
	return (event) => {
		result.push(event);
	}
};

function createEchoRequestHandler<P>(result: P[]) : hostConnection.RequestHandler<P, any, any> {
	return (param: P): any | ResponseError<any> => {
		result.push(param);
		return param;
	}
};

let Logger: hostConnection.Logger = {
	error: (message: string) => {},
	warn: (message: string) => {},
	info: (message: string) => {},
	log: (message: string) => {}
}

describe('Connection', () => {

	it('Handle Single Request', (done) => {

		let outputStream = new TestWritable();
		let inputStream = new Readable();

		let connection = hostConnection.createMessageConnection(inputStream, outputStream, Logger);
		connection.onRequest(testRequest1, testRequestHandler);
		connection.listen();

		inputStream.push(newRequestString(0, testRequest1.method, newParams('foo')));
		inputStream.push(null);

		let expected : ResponseMessage[]= [
			{ jsonrpc: '2.0', id: 0, result: 'foo' }
		];

		setImmediate(() => {
			assertMessages(outputStream.data, expected, done);
		});


	});

	it('Handle Multiple Requests', (done) => {

		let outputStream = new TestWritable();
		let inputStream = new Readable();

		let connection = hostConnection.createMessageConnection(inputStream, outputStream, Logger);
		connection.onRequest(testRequest1, testRequestHandler);
		connection.onRequest(testRequest2, testRequestHandler);
		connection.listen();

		inputStream.push(newRequestString(0, testRequest1.method, newParams('foo')));
		inputStream.push(newRequestString(1, testRequest2.method, newParams('bar')));
		inputStream.push(null);

		let expected : ResponseMessage[]= [
			{ jsonrpc: '2.0', id: 0, result: 'foo' },
			{ jsonrpc: '2.0', id: 1, result: 'bar' }
		];

		setImmediate(() => {
			assertMessages(outputStream.data, expected, done);
		});


	});

	it('Handle Invalid Request', (done) => {

		let outputStream = new TestWritable();
		let inputStream = new Readable();

		let connection = hostConnection.createMessageConnection(inputStream, outputStream, Logger);
		connection.onRequest(testRequest1, testRequestHandler);
		connection.listen();

		inputStream.push(newRequestString(0, testRequest1.method, {}));
		inputStream.push(null);

		let expected : ResponseMessage[]= [
			{ jsonrpc: '2.0', id: 0, error: <any>{ code: ErrorCodes.InvalidRequest } }
		];

		setImmediate(() => {
			assertMessages(outputStream.data, expected, done);
		});


	});

	it('Unhandled Request', (done) => {

		let outputStream = new TestWritable();
		let inputStream = new Readable();

		let connection = hostConnection.createMessageConnection(inputStream, outputStream, Logger);
		connection.onRequest(testRequest1, testRequestHandler);
		connection.listen();

		inputStream.push(newRequestString(0, testRequest2.method, {}));
		inputStream.push(null);

		let expected : ResponseMessage[]= [
			{ jsonrpc: '2.0', id: 0, error: <any>{ code: ErrorCodes.MethodNotFound } }
		];

		setImmediate(() => {
			assertMessages(outputStream.data, expected, done);
		});


	});

	it('Send Request', (done) => {

		let outputStream = new TestWritable();
		let inputStream = new Readable();
		inputStream.push(null);

		let connection = hostConnection.createMessageConnection(inputStream, outputStream, Logger);
		connection.sendRequest(testRequest1, { 'foo': true });
		connection.listen();

		let expected : RequestMessage[] = [
			{ jsonrpc: '2.0', id: 0, method: testRequest1.method, params: { 'foo': true } }
		];

		setImmediate(() => {
			assertMessages(outputStream.data, expected, done);
		});


	});

	it('Send Request receives undefined params', (done) => {

		let outputStream = new TestWritable();
		let inputStream = new Readable();
		inputStream.push(null);

		let connection = hostConnection.createMessageConnection(inputStream, outputStream, Logger);
		connection.sendRequest(testRequest1, undefined);
		connection.listen();

		let expected : RequestMessage[] = [
			{ jsonrpc: '2.0', id: 0, method: testRequest1.method }
		];

		setImmediate(() => {
			assertMessages(outputStream.data, expected, done);
		});


	});

	it('Send and Receive Request', (done) => {
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let params = { 'foo': [ { bar: 1 } ]};

		let receivedRequests = [];
		let receivedResults = [];

		let connection2 = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		connection2.onRequest(testRequest1, createEchoRequestHandler(receivedRequests));
		connection2.listen();

		let connection1 = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		connection1.listen();
		connection1.sendRequest(testRequest1, params).then(result => {
			receivedResults.push(result);
			assert.deepEqual(receivedRequests, [ params ]);
			assert.deepEqual(receivedResults, [ params ]);
			done();
		});
	});

	it('Receives Undefined as null', (done) => {
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let connection2 = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		connection2.onRequest(testRequest1, () => {
			return undefined;
		});
		connection2.listen();

		let connection1 = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		connection1.listen();
		connection1.sendRequest(testRequest1, {}).then(result => {
			assert.deepEqual(result, null);
			done();
		});
	});

	it('Receives null as null', (done) => {
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let connection2 = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		connection2.onRequest(testRequest1, () => {
			return null;
		});
		connection2.listen();

		let connection1 = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		connection1.listen();
		connection1.sendRequest(testRequest1, {}).then(result => {
			assert.deepEqual(result, null);
			done();
		});
	});

	let testNotification: NotificationType<any, void> = { method: "testNotification", _: undefined };
	it('Send and Receive Notification', (done) => {

		let outputStream = new TestWritable();
		let duplexStream = new TestDuplex();
		let inputStream = new Readable();
		inputStream.push(null);

		let params = { 'foo': true };

		let connection1 = hostConnection.createMessageConnection(inputStream, duplexStream, Logger);
		connection1.listen();
		connection1.sendNotification(testNotification, params);

		let resultingEvents = [];

		let connection2 = hostConnection.createMessageConnection(duplexStream, outputStream, Logger);
		connection2.onNotification(testNotification, createEventHandler(resultingEvents));
		connection2.listen();
		setTimeout(() => {
			assert.deepEqual(resultingEvents, [ params ]);
			done();
		}, 10);

	});

	it(('Unhandled notification event'), (done) => {
		let outputStream = new TestWritable();
		let duplexStream = new TestDuplex();
		let inputStream = new Readable();
		inputStream.push(null);

		let params = { 'foo': true };

		let connection1 = hostConnection.createMessageConnection(inputStream, duplexStream, Logger);
		connection1.listen();
		connection1.sendNotification(testNotification, params);

		let connection2 = hostConnection.createMessageConnection(duplexStream, outputStream, Logger);
		connection2.onUnhandledNotification((message) => {
			assert.strictEqual(message.method, testNotification.method);
			done();
		});
		connection2.listen();
	});

	it(('Dispose connection'), (done) => {
		let outputStream = new TestWritable();
		let duplexStream = new TestDuplex();
		let inputStream = new Readable();
		inputStream.push(null);

		let params = { 'foo': true };

		let connection1 = hostConnection.createMessageConnection(inputStream, duplexStream, Logger);
		let connection2 = hostConnection.createMessageConnection(duplexStream, outputStream, Logger);
		connection2.onRequest(testRequest1, (params) => {
			connection1.dispose();
			return {};
		});
		connection2.listen();

		connection1.listen();
		connection1.sendRequest(testRequest1, {}).then((value) => {
			assert(false);
		}, (error) => {
			done();
		});
		connection1.sendNotification(testNotification, params);
	});

	it(('Disposed connection throws'), (done) => {
		let duplexStream = new TestDuplex();
		let inputStream = new Readable();
		inputStream.push(null);
		let connection1 = hostConnection.createMessageConnection(inputStream, duplexStream, Logger);
		connection1.dispose();
		try {
			connection1.sendNotification(testNotification);
			assert(false);
		} catch (error) {
			done();
		}
	});

	it(('Two listen throw'), (done) => {
		let duplexStream = new TestDuplex();
		let inputStream = new Readable();
		inputStream.push(null);
		let connection1 = hostConnection.createMessageConnection(inputStream, duplexStream, Logger);
		connection1.listen();
		try {
			connection1.listen();
			assert(false);
		} catch (error) {
			done();
		}
	});

	it(('Notify on connection dispose'), (done) => {
		let duplexStream = new TestDuplex();
		let inputStream = new Readable();
		inputStream.push(null);
		let connection1 = hostConnection.createMessageConnection(inputStream, duplexStream, Logger);
		connection1.onDispose(() => {
			done();
		});
		connection1.dispose();
	});

	it (('Array params in notifications'), (done) => {
		let type: NotificationType2<number, string, void> = { method: 'test', _: undefined };
		let outputStream = new TestWritable();
		let duplexStream = new TestDuplex();
		let inputStream = new Readable();
		inputStream.push(null);

		let connection1 = hostConnection.createMessageConnection(inputStream, duplexStream, Logger);
		connection1.listen();
		connection1.sendNotification(type, 10, 'vscode');

		let connection2 = hostConnection.createMessageConnection(duplexStream, outputStream, Logger);
		connection2.onNotification(type, (p1, p2) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 'vscode');
			done();
		});
		connection2.listen();
	});

	it (('Array params in request / response'), (done) => {
		let type: RequestType3<number, number, number, number, void, void> = { method: 'add', _: undefined };
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let connection2 = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		connection2.onRequest(type, (p1, p2, p3) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, 30);
			return p1 + p2 + p3;
		});
		connection2.listen();

		let connection1 = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		connection1.listen();
		connection1.sendRequest(type, 10, 20, 30).then(result => {
			assert.strictEqual(result, 60);
			done();
		}, (error) => {
			assert(false);
			done();
		});
	});

	it (('Array params in request / response with token'), (done) => {
		let type: RequestType3<number, number, number, number, void, void> = { method: 'add', _: undefined };
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let connection2 = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		connection2.onRequest(type, (p1, p2, p3, token) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, 30);
			return p1 + p2 + p3;
		});
		connection2.listen();

		let connection1 = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		let token = new CancellationTokenSource().token;
		connection1.listen();
		connection1.sendRequest(type, 10, 20, 30, token).then(result => {
			assert.strictEqual(result, 60);
			done();
		}, (error) => {
			assert(false);
			done();
		});
	});

	it (('Untyped request / response'), (done) => {
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');

		let connection2 = hostConnection.createMessageConnection(duplexStream2, duplexStream1, Logger);
		connection2.onRequest('test', (p1, p2, p3, token) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 20);
			assert.strictEqual(p3, 30);
			return p1 + p2 + p3;
		});
		connection2.listen();

		let connection1 = hostConnection.createMessageConnection(duplexStream1, duplexStream2, Logger);
		let token = new CancellationTokenSource().token;
		connection1.listen();
		connection1.sendRequest('test', 10, 20, 30, token).then(result => {
			assert.strictEqual(result, 60);
			done();
		}, (error) => {
			assert(false);
			done();
		});
	});
});