/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { Duplex, Writable, Readable, Transform } from 'stream';
import { inherits } from 'util';

import { Message, RequestMessage, RequestType, ResponseMessage, ResponseError, NotificationType, NotificationType2, isReponseMessage, ErrorCodes } from '../messages';
import { StreamMessageWriter } from '../messageWriter';
import { StreamMessageReader } from '../messageReader';

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

let testRequest1: RequestType<any, any, any> = { method: 'testCommand1' };
let testRequest2: RequestType<any, any, any> = { method: 'testCommand2' };
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

		let connection = hostConnection.createServerMessageConnection(inputStream, outputStream, Logger);
		connection.onRequest(testRequest1, testRequestHandler);
		connection.listen();

		inputStream.push(newRequestString(0, testRequest1.method, newParams('foo')));
		inputStream.push(null);

		let expected : ResponseMessage[]= [
			{ jsonrpc: '2.0', id: 0, result: 'foo' }
		];

		setTimeout(() => {
			assertMessages(outputStream.data, expected, done);
		});


	});

	it('Handle Multiple Requests', (done) => {

		let outputStream = new TestWritable();
		let inputStream = new Readable();

		let connection = hostConnection.createServerMessageConnection(inputStream, outputStream, Logger);
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

		setTimeout(() => {
			assertMessages(outputStream.data, expected, done);
		});


	});

	it('Handle Invalid Request', (done) => {

		let outputStream = new TestWritable();
		let inputStream = new Readable();

		let connection = hostConnection.createServerMessageConnection(inputStream, outputStream, Logger);
		connection.onRequest(testRequest1, testRequestHandler);
		connection.listen();

		inputStream.push(newRequestString(0, testRequest1.method, {}));
		inputStream.push(null);

		let expected : ResponseMessage[]= [
			{ jsonrpc: '2.0', id: 0, error: <any>{ code: ErrorCodes.InvalidRequest } }
		];

		setTimeout(() => {
			assertMessages(outputStream.data, expected, done);
		});


	});

	it('Unhandled Request', (done) => {

		let outputStream = new TestWritable();
		let inputStream = new Readable();

		let connection = hostConnection.createServerMessageConnection(inputStream, outputStream, Logger);
		connection.onRequest(testRequest1, testRequestHandler);
		connection.listen();

		inputStream.push(newRequestString(0, testRequest2.method, {}));
		inputStream.push(null);

		let expected : ResponseMessage[]= [
			{ jsonrpc: '2.0', id: 0, error: <any>{ code: ErrorCodes.MethodNotFound } }
		];

		setTimeout(() => {
			assertMessages(outputStream.data, expected, done);
		});


	});

	it('Send Request', (done) => {

		let outputStream = new TestWritable();
		let inputStream = new Readable();
		inputStream.push(null);

		let connection = hostConnection.createClientMessageConnection(inputStream, outputStream, Logger);
		connection.sendRequest(testRequest1, { 'foo': true });
		connection.listen();

		let expected : RequestMessage[] = [
			{ jsonrpc: '2.0', id: 0, method: testRequest1.method, params: { 'foo': true } }
		];

		setTimeout(() => {
			assertMessages(outputStream.data, expected, done);
		});


	});

	it('Send and Receive Request', (done) => {

		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');
		let inputStream = new Readable();
		inputStream.push(null);

		let params = { 'foo': [ { bar: 1 } ]};

		let receivedRequests = [];
		let receivedResults = [];

		let connection2 = hostConnection.createServerMessageConnection(duplexStream2, duplexStream1, Logger);
		connection2.onRequest(testRequest1, createEchoRequestHandler(receivedRequests));
		connection2.listen();

		let connection1 = hostConnection.createClientMessageConnection(duplexStream1, duplexStream2, Logger);
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
		let inputStream = new Readable();
		inputStream.push(null);

		let connection2 = hostConnection.createServerMessageConnection(duplexStream2, duplexStream1, Logger);
		connection2.onRequest(testRequest1, () => {
			return undefined;
		});
		connection2.listen();

		let connection1 = hostConnection.createClientMessageConnection(duplexStream1, duplexStream2, Logger);
		connection1.listen();
		connection1.sendRequest(testRequest1, {}).then(result => {
			assert.deepEqual(result, null);
			done();
		});
	});

	it('Receives null as null', (done) => {
		let duplexStream1 = new TestDuplex('ds1');
		let duplexStream2 = new TestDuplex('ds2');
		let inputStream = new Readable();
		inputStream.push(null);

		let connection2 = hostConnection.createServerMessageConnection(duplexStream2, duplexStream1, Logger);
		connection2.onRequest(testRequest1, () => {
			return null;
		});
		connection2.listen();

		let connection1 = hostConnection.createClientMessageConnection(duplexStream1, duplexStream2, Logger);
		connection1.listen();
		connection1.sendRequest(testRequest1, {}).then(result => {
			assert.deepEqual(result, null);
			done();
		});
	});

	let testNotification: NotificationType<any> = { method: "testNotification" };
	it('Send and Receive Notification', (done) => {

		let outputStream = new TestWritable();
		let duplexStream = new TestDuplex();
		let inputStream = new Readable();
		inputStream.push(null);

		let params = { 'foo': true };

		let connection1 = hostConnection.createServerMessageConnection(inputStream, duplexStream, Logger);
		connection1.listen();
		connection1.sendNotification(testNotification, params);

		let resultingEvents = [];

		let connection2 = hostConnection.createClientMessageConnection(duplexStream, outputStream, Logger);
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

		let connection1 = hostConnection.createServerMessageConnection(inputStream, duplexStream, Logger);
		connection1.listen();
		connection1.sendNotification(testNotification, params);

		let connection2 = hostConnection.createClientMessageConnection(duplexStream, outputStream, Logger);
		connection2.onUnhandledNotification((message) => {
			assert.strictEqual(message.method, testNotification.method);
			done();
		});
		connection2.listen();
	});

	it (('Array params in notifications'), (done) => {
		let type: NotificationType2<number, string> = { method: 'test' };
		let outputStream = new TestWritable();
		let duplexStream = new TestDuplex();
		let inputStream = new Readable();
		inputStream.push(null);

		let connection1 = hostConnection.createServerMessageConnection(inputStream, duplexStream, Logger);
		connection1.listen();
		connection1.sendNotification(type, 10, 'vscode');

		let connection2 = hostConnection.createClientMessageConnection(duplexStream, outputStream, Logger);
		connection2.onNotification(type, (p1, p2) => {
			assert.strictEqual(p1, 10);
			assert.strictEqual(p2, 'vscode');
			done();
		});
		connection2.listen();
	});
});



interface Type1<P1> {
	_: P1;
}

interface Type2<P1, P2> {
	method: string;
	_: [P1, P2];
}

interface Connection {
	sendMessage<P1>(type: Type1<P1>, p1: P1): void;
	sendMessage<P1, P2>(type: Type2<P1, P2>, p1: P1, p2: P2): void;
}

let connection: Connection;
let type: Type2<string, number> = { method: 'dirk', _: undefined }

connection.sendMessage(type, 'dirk', 10);
