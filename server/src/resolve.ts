/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

interface Message {
	command: string;
	success?: boolean;
	args?: any;
	result?: any
}

process.on('message', (message: Message) => {
	if (message.command === 'exit') {
		process.exit(0);
	} else if (message.command === 'resolve') {
		try {
			let result = (<any>require).resolve(message.args);
			process.send({ command: 'resolve', success: true, result: result });
		} catch (err) {
			process.send({ command: 'resolve', success: false });
		}
	}
});