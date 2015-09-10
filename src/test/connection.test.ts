/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import * as assert from 'assert';

import { Duplex, Writable, Readable } from 'stream';
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

function newRequestString(seq: number, command: string, arg: any) : string {
	var request : RequestMessage = { type: Message.Request, seq, command, arguments: arg };
	var str = JSON.stringify(request);
	return `Content-Length: ${str.length}\r\n\r\n${str}`;
}


function assertResponses(resultData: string, expected: ResponseMessage[], done: MochaDone) {
	var resultStream = new Readable();
	resultStream.push(resultData);
	resultStream.push(null);
	var actualResponses : Message[] = [];
	new MessageReader(resultStream, (res) => {
		actualResponses.push(res);
	});
	setTimeout(() => {
		try {
			assert.deepEqual(actualResponses, expected);
			done();
		} catch (e) {
			done(e);
		}
	}, 10);
}

var testCommand = 'test';
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

describe('Connection', () => {

	it('Single Request', (done) => {
	
		let outputStream = new TestWritable();	
		var inputStream = new Readable();
		
		var connection = hostConnection.connect(inputStream, outputStream);
		connection.handleRequest(testCommand, testRequestHandler);
	
		inputStream.push(newRequestString(1, testCommand, newTestBody('foo')));
		inputStream.push(null);
		
		var expected : ResponseMessage[]= [
			{ type: Message.Response, seq: 0, request_seq: 1, command: testCommand, success: true, body: 'foo' }
		];		
		
		setTimeout(() => {
			assertResponses(outputStream.data, expected, done);
		});
		

	});

	it('Multiple Requests', (done) => {
	
		let outputStream = new TestWritable();	
		var inputStream = new Readable();
		
		var connection = hostConnection.connect(inputStream, outputStream);
		connection.handleRequest(testCommand, testRequestHandler);
	
		inputStream.push(newRequestString(1, testCommand, newTestBody('foo')));
		inputStream.push(newRequestString(2, testCommand, newTestBody('bar')));
		inputStream.push(null);
		
		var expected : ResponseMessage[]= [
			{ type: Message.Response, seq: 0, request_seq: 1, command: testCommand, success: true, body: 'foo' },
			{ type: Message.Response, seq: 1, request_seq: 2, command: testCommand, success: true, body: 'bar' }
		];
		
		setTimeout(() => {
			assertResponses(outputStream.data, expected, done);
		});
		

	});
	
	it('Invalid Request', (done) => {
	
		let outputStream = new TestWritable();	
		var inputStream = new Readable();
		
		var connection = hostConnection.connect(inputStream, outputStream);
		connection.handleRequest(testCommand, testRequestHandler);
	
		inputStream.push(newRequestString(1, testCommand, {}));
		inputStream.push(null);
		
		var expected : ResponseMessage[]= [
			{ type: Message.Response, seq: 0, request_seq: 1, command: testCommand, success: false, message: 'invalid' }
		];
		
		setTimeout(() => {
			assertResponses(outputStream.data, expected, done);
		});
		

	});	
});