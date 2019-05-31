#### Reporting server task progress

Many tools are capable of performing some background task processing or data streaming. From a UX point of view, it's good to report both the fact that the tool is performing some background work, but also report the progress being made for it. To realize that and to provide a simple proposal based on which the feature can be later improved, the following additions are proposed:

_Client Capabilities_:

The client sets the following capability if it is supporting notifying task progress.

```ts
	/**
	 * Window specific client capabilities.
	 */
	window?: {
		/**
		 * Whether client supports handling progress notifications.
		 */
		progress?: boolean;
	}
```

##### Progress Start Notification

The `window/progress/start` notification is sent from the server to the client to ask the client to start progress.

_Notification_:

* method: 'window/progress/start'
* params: `ProgressStartParams` defined as follows:

```ts
export interface ProgressStartParams {

	/**
	 * A unique identifier to associate multiple progress notifications with
	 * the same progress.
	 */
	id: string;

	/**
	 * Mandatory title of the progress operation. Used to briefly inform about
	 * the kind of operation being performed.
	 *
	 * Examples: "Indexing" or "Linking dependencies".
	 */
	title: string;

	/**
	 * Controls if a cancel button should show to allow the user to cancel the
	 * long running operation. Clients that don't support cancellation are allowed
	 * to ignore the setting.
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

##### Progress Report Notification

The `window/progress/report` notification is sent from the server to the client to report progress for a previously started progress.

_Notification_:

* method: 'window/progress/report'
* params: `ProgressReportParams` defined as follows:

```ts
export interface ProgressReportParams {
 
	/**
	 * A unique identifier to associate multiple progress notifications with the same progress.
	 */
	id: string;

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
	 * If infinite progress was indicated in the start notification client
	 * are allowed to ignore the value. In addition the value should be steadily
	 * rising. Clients are free to ignore values that are not following this rule.
	 */
	percentage?: number;
}
```

##### Progress Done Notification

The `window/progress/done` notification is sent from the server to the client to stop a previously started progress.

_Notification_:

* method: 'window/progress/done'
* params: `ProgressDoneParams` defined as follows:

```ts
export interface ProgressDoneParams {
	/**
	 * A unique identifier to associate multiple progress notifications with the same progress.
	 */
	id: string;
}
```

##### Progress Cancel Notification

The `window/progress/cancel` notification is sent from the client to the server to inform the server that the user has pressed the
cancel button on the progress UX. A server receiving a cancel request must still close a progress using the done notification.

_Notification_:

* method: 'window/progress/cancel'
* params: `ProgressCancelParams` defined as follows:

```ts
export interface ProgressCancelParams {
	/**
	 * A unique identifier to associate multiple progress notifications with the same progress.
	 */
	id: string;
}
```