/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import * as assert from 'assert';

import { Duplex, Writable, Readable, Transform } from 'stream';
import { inherits } from 'util';

import { Message, RequestMessage, ResponseMessage, Response } from '../messages';
import { MessageWriter } from '../messageWriter';
import { MessageReader } from '../messageReader';

import * as hostConnection from '../connection';

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
	var val = chunk.toString();
	this.data += val;
	if (this.dbg) console.log(this.name + ': write: ' + val);
	this.emit('readable');
	done();
}

TestDuplex.prototype._read = function(size) {
	if (size > this.data.length) {
		size = this.data.length;
	}
	var val = this.data.substring(0, size);
	if (this.dbg) console.log(this.name + ': read: ' + val);
	this.push(val);
	this.data = this.data.substring(size);
	
	if (this.isWriteFinished && this.data.length === 0) {
		this.push(null);
		this.isWriteFinished = false;
	}
}

function newRequestString(seq: number, command: string, arg: any) : string {
	var request : RequestMessage = { type: Message.Request, seq, command, arguments: arg };
	var str = JSON.stringify(request);
	return `Content-Length: ${str.length}\r\n\r\n${str}`;
}

function selectProperties(properties: string[]) {
	return (obj) => {
		var res= {};
		properties.forEach(p => {
			res[p] = obj[p];
		});
		return res;		
	}
}


function assertMessages(resultData: string, expected: Message[], done: MochaDone) {
	var resultStream = new Readable();
	resultStream.push(resultData);
	resultStream.push(null);
	var actual : Message[] = [];
	new MessageReader(resultStream, (res) => {
		if (res.type === Message.Response) {
			delete (<ResponseMessage> res).message;
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

var testCommand1 = 'testCommand1';
var testCommand2 = 'testCommand2';
function newTestBody(content: string)  { 
	return { documents: [ { content: content } ]};
};

function testRequestHandler(args: any) : Response {
	if (args.documents && args.documents.length === 1 && args.documents[0].content) {
		return {
			success: true,
			body: args.documents[0].content
		};
	} else {
		return {
			success: false,
			message: "invalid"
		};
	}
};


function createEventHandler<T>(result: T[]) : hostConnection.IEventHandler<T> {
	return (event) => {
		result.push(event);
	}
};

function createEchoRequestHandler<T>(result: T[]) : hostConnection.IRequestHandler<T, Response> {
	return (body: T) => {
		result.push(body);
		return {
			success: true,
			body: <any> body
		};
	}
};

describe('Connection', () => {

	it('Handle Single Request', (done) => {
	
		let outputStream = new TestWritable();	
		var inputStream = new Readable();
		
		var connection = hostConnection.connect(inputStream, outputStream);
		connection.onRequest(testCommand1, testRequestHandler);
	
		inputStream.push(newRequestString(1, testCommand1, newTestBody('foo')));
		inputStream.push(null);
		
		var expected : ResponseMessage[]= [
			{ type: Message.Response, seq: 0, request_seq: 1, command: testCommand1, success: true, body: 'foo' }
		];		
		
		setTimeout(() => {
			assertMessages(outputStream.data, expected, done);
		});
		

	});

	it('Handle Multiple Requests', (done) => {
	
		let outputStream = new TestWritable();	
		var inputStream = new Readable();
		
		var connection = hostConnection.connect(inputStream, outputStream);
		connection.onRequest(testCommand1, testRequestHandler);
		connection.onRequest(testCommand2, testRequestHandler);
	
		inputStream.push(newRequestString(1, testCommand1, newTestBody('foo')));
		inputStream.push(newRequestString(2, testCommand2, newTestBody('bar')));
		inputStream.push(null);
		
		var expected : ResponseMessage[]= [
			{ type: Message.Response, seq: 0, request_seq: 1, command: testCommand1, success: true, body: 'foo' },
			{ type: Message.Response, seq: 1, request_seq: 2, command: testCommand2, success: true, body: 'bar' }
		];
		
		setTimeout(() => {
			assertMessages(outputStream.data, expected, done);
		});
		

	});
	
	it('Handle Invalid Request', (done) => {
	
		let outputStream = new TestWritable();	
		var inputStream = new Readable();
		
		var connection = hostConnection.connect(inputStream, outputStream);
		connection.onRequest(testCommand1, testRequestHandler);
	
		inputStream.push(newRequestString(1, testCommand1, {}));
		inputStream.push(null);
		
		var expected : ResponseMessage[]= [
			{ type: Message.Response, seq: 0, request_seq: 1, command: testCommand1, success: false }
		];
		
		setTimeout(() => {
			assertMessages(outputStream.data, expected, done);
		});
		

	});	
	
	it('Unhandled Request', (done) => {
	
		let outputStream = new TestWritable();	
		var inputStream = new Readable();
		
		var connection = hostConnection.connect(inputStream, outputStream);
		connection.onRequest(testCommand1, testRequestHandler);
	
		inputStream.push(newRequestString(1, testCommand2, {}));
		inputStream.push(null);
		
		var expected : ResponseMessage[]= [
			{ type: Message.Response, seq: 0, request_seq: 1, command: testCommand2, success: false, code: hostConnection.ERROR_NOT_HANDLED }
		];
		
		setTimeout(() => {
			assertMessages(outputStream.data, expected, done);
		});
		

	});
	
	it('Send Request', (done) => {
	
		let outputStream = new TestWritable();	
		var inputStream = new Readable();
		inputStream.push(null);
		
		var connection = hostConnection.connect(inputStream, outputStream);
		connection.sendRequest(testCommand1, { 'foo': true });
		
		var expected : Message[] = [
			{ type: Message.Request, seq: 0, command: testCommand1, arguments: { 'foo': true } }
		];
		
		setTimeout(() => {
			assertMessages(outputStream.data, expected, done);
		});
		

	});
	
	it('Send and Receive Request', (done) => {
	
		let duplexStream1 = new TestDuplex('ds1');	
		let duplexStream2 = new TestDuplex('ds2');	
		var inputStream = new Readable();
		inputStream.push(null);
		
		var requestBody = { 'foo': [ { bar: 1 } ]};
		
		var receivedRequests = [];
		var receivedResponses = [];
		
		var connection1 = hostConnection.connect(duplexStream1, duplexStream2);
		connection1.sendRequest(testCommand1, requestBody).then(response => {
			receivedResponses.push(response);
		});
		
		var connection2 = hostConnection.connect(duplexStream2, duplexStream1);
		connection2.onRequest(testCommand1, createEchoRequestHandler(receivedRequests));		
		
		setTimeout(() => {
				assert.deepEqual(receivedRequests, [ requestBody ]);
				assert.deepEqual(receivedResponses.map(selectProperties(['success', 'body'])), [ { success: true, body: requestBody } ]);
				done();
		}, 10);

	});	
	
	var testEvent = "testEvent";
	
	it('Send and Receive Event', (done) => {
	
		let outputStream = new TestWritable();	
		let duplexStream = new TestDuplex();	
		var inputStream = new Readable();
		inputStream.push(null);
		
		var eventBody = { 'foo': true };
		
		var connection1 = hostConnection.connect(inputStream, duplexStream);
		connection1.sendEvent(testEvent, eventBody);
		
		var resultingEvents = [];
		
		var connection2 = hostConnection.connect(duplexStream, outputStream);
		connection2.onEvent(testEvent, createEventHandler(resultingEvents));		
		
		
		setTimeout(() => {
			assert.deepEqual(resultingEvents, [ eventBody ]);
			done();
		}, 10);

	});		
});