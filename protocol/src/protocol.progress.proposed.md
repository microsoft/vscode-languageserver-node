#### Reporting server task progress

Many tools are capable of performing some background task processing or data streaming. From a UX point of view, it's good to report both the fact that the tool is performing some background work, but also report the progress being made for it. Work done progress reporting leverages the generic progress reporting provided by LSP using the `$/progress` notification. The reporting uses tokens issued either by the client or requested by the server using the `window/workDoneProgress/create` request.

_Client Capabilities_:

The client sets the following capability if it supports initiating work done progress from the server side.

```ts
	/**
	 * Window specific client capabilities.
	 */
	window?: {
		/**
		 * Whether client supports create a work done progress UI from the server side.
		 */
		workDoneProgress?: boolean;
	}
```

##### Work Done Progress create Request (:rightwards_arrow_with_hook:)

The `window/workDoneProgress/create` request is sent from the server to the client to ask the client to create a work done progress.

_Request_:

* method: 'window/workDoneProgress/create'
* params: `WorkDoneProgressCreateParams` defined as follows:

```ts
export interface WorkDoneProgressCreateParams {
	/**
	 * The token to be used to report progress.
	 */
	token: ProgressToken;
}
```

_Response_:

* result: void
* error: code and message set in case an exception happens during the 'window/workDoneProgress/create' request

As mentioned earlier the actual progress reporting is done using the generic `$/progress` notification as specified in LSP. The following value payloads are valid for work done progress tokens:

###### WorkDoneProgressStart

This payload is defined as follows:

```ts
export interface WorkDoneProgressStart {

	kind: 'start';

	/**
	 * Mandatory title of the progress operation. Used to briefly inform about
	 * the kind of operation being performed.
	 *
	 * Examples: "Indexing" or "Linking dependencies".
	 */
	title: string;

	/**
	 * Controls if a cancel button should show to allow the user to cancel the
	 * long running operation.
	 *
	 * Clients that don't support cancellation are allowed to ignore the setting.
	 */
	cancellable?: boolean;

	/**
	 * Optional, more detailed associated progress message. Contains
	 * complementary information to the `title`.
	 *
	 * Examples: "3/25 files", "project/src/module2", "node_modules/some_dep".
	 * If unset, the previous progress message (if any) is still valid.
	 */
	message?: string;

	/**
	 * Optional progress percentage to display (value 100 is considered 100%).
	 * If not provided infinite progress is assumed and clients are allowed
	 * to ignore the `percentage` value in subsequent in report notifications.
	 *
	 * The value should be steadily rising. Clients are free to ignore values
	 * that are not following this rule.
	 */
	percentage?: number;
}
```

and should only be sent once per work done progress token.

###### WorkDoneProgressReport

This payload is defined as follows:

```ts

export interface WorkDoneProgressReport {

	kind: 'report';

	/**
	 * Controls enablement state of a cancel button. This property is only valid if a cancel
	 * button got requested in the `WorkDoneProgressStart` payload.
	 *
	 * Clients that don't support cancellation or don't support control the button's
	 * enablement state are allowed to ignore the setting.
	 */
	cancellable?: boolean;

	/**
	 * Optional, more detailed associated progress message. Contains
	 * complementary information to the `title`.
	 *
	 * Examples: "3/25 files", "project/src/module2", "node_modules/some_dep".
	 * If unset, the previous progress message (if any) is still valid.
	 */
	message?: string;

	/**
	 * Optional progress percentage to display (value 100 is considered 100%).
	 * If not provided infinite progress is assumed and clients are allowed
	 * to ignore the `percentage` value in subsequent in report notifications.
	 *
	 * The value should be steadily rising. Clients are free to ignore values
	 * that are not following this rule.
	 */
	percentage?: number;
}
```

The payload can be sent n times.

###### WorkDoneProgressDone

This payload is defined as follows:

```ts
export interface WorkDoneProgressDone {

	kind: 'done';

	/**
	 * Optional, a final message indicating to for example indicate the outcome
	 * of the operation.
	 */
	message?: string;
}
```

The payload should only be sent once.

##### Work Done Progress cancel Notification (:leftwards_arrow:)

The `window/workDoneProgress/cancel` is sent from the client to the server to indicate that the user has pressed cancel on a server initiated work done progress.

_Notification_:

* method: 'window/workDoneProgress/cancel'
* params: `WorkDoneProgressCancelParams` defined as follows:

```ts
export interface WorkDoneProgressCancelParams {
	/**
	 * The token to be used to report progress.
	 */
	token: ProgressToken;
}
```