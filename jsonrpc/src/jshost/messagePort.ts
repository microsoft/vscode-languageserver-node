'use strict';

// A MessageChannel has two MessagePorts.
// Messages are sent from one port and listening out for them arriving at the other.
export class MessagePort {
	private _messageListeners: any[] = [];
	private _errorListeners: any[] = [];
	private _workerMessageListeners: any[] = [];
	private _workerErrorListeners: any[] = [];
	private _terminated = false;

	public onerror: any;
	public onmessage: any;

	public constructor() {
	}

	public start() {
		this._terminated = true;
	}

	public close() {
		this._terminated = true;
	}

	public postMessage(msg: any, transfer?: any) {
		if (typeof msg === 'undefined') {
			throw new Error('postMessage() requires an argument');
		}

		if (this._terminated) {
			return;
		}

		this._runPostMessage(msg, transfer);
	}

	public addEventListener(eventType: string, func: any) {
		if (eventType === 'message') {
			this._messageListeners.push(func);
		} else if (eventType === 'error') {
			this._errorListeners.push(func);
		} else
		{
			return;
		}
	}

	public removeEventListener(eventType: string, func: any) {
		var listeners;
		if (eventType === 'message') {
			listeners = this._messageListeners;
		} else if (eventType === 'error') {
			listeners = this._errorListeners;
		} else {
			return;
		}

		var i = -1;
		while (++i < listeners.length) {
			var listener = listeners[i];
			if (listener === func) {
				delete listeners[i];
				break;
			}
		}
	}

	private _runPostMessage(msg: any, transfer?: any) {
		var self = this;
		function _callFun(listener: (arg0: { data: any; ports: any }) => void) {
			try {
				listener({data: msg, ports: transfer});
			} catch (err) {
				self._postError(err);
			}
		}

		if (typeof self.onmessage === 'function') {
			_callFun(self.onmessage);
		}

		this._executeEach(this._workerMessageListeners, _callFun);
	}

	private _executeEach(arr: string | any[], fun: { (listener: any): void; (listener: any): void; (listener: any): void; (listener: any): void; (arg0: any): void }) {
		var i = -1;
		while (++i < arr.length) {
			if (arr[i]) {
				fun(arr[i]);
			}
		}
	}

	private _callErrorListener(err: { message: any }) {
		return function (listener: (arg0: { type: string; error: any; message: any }) => void) {
			listener({
				type: 'error',
				error: err,
				message: err.message
			});
		};
	}

	private _postError(err: any) {
		var callFun = this._callErrorListener(err);
		if (typeof this.onerror === 'function') {
			callFun(this.onerror);
		}

		if (typeof this.onerror === 'function') {
			callFun(this.onerror);
		}

		this._executeEach(this._errorListeners, callFun);
		this._executeEach(this._workerErrorListeners, callFun);
	}
}