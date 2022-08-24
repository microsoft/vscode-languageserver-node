'use strict';

import { MessagePort } from './messagePort';

// A message channel has two ports.
// port1 is attached to the context that originated the channel.
// port2 is attached to other end of the channel.
export class MessageChannel {
	public port1: MessagePort;
	public port2: MessagePort;

	public constructor() {
		this.port1 = new MessagePort();
		this.port2 = new MessagePort();
	}
}
