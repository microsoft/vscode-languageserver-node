#### Reporting server task progress

Many tools are capable of performing some background task processing or data streaming. From a UX point of view, it's good to report both the fact that the tool is performing some background work, but also report the progress being made for it. To realize that and to provide a simple proposal based on which the feature can be later improved, the following additions are proposed:

_Client Capabilities_:

The client sets the following capability if it is supporting notifying task progress.

```ts
/**
 * Experimental client capabilities.
 */
experimental: {
  /**
   * The client has support for reporting progress.
   */
  progress?: boolean;
}
```

##### Window Progress Notification
_Notification_:

The `window/progress` notification is sent from the server to the client to ask the client to indicate progress.

* method: 'window/progress'
* params: `ProgressParams` defined as follows:
```ts
export interface ProgressParams {
    /**
     * A unique identifier to associate multiple progress notifications with the same progress.
     */
    id: string;

    /**
     * Optional title of the progress.
     * If unset, the previous title (if any) is still valid.
     */
    title?: string;

    /**
     * Optional progress message to display.
     * If unset, the previous progress message (if any) is still valid.
     */
    message?: string;

    /**
     * Optional progress percentage to display (value 1 is considered 1%).
     * If unset, the previous progress percentage (if any) is still valid.
     */
    percentage?: number;

    /**
     * Set to true on the final progress update.
     * No more progress notifications with the same ID should be sent.
     */
    done?: boolean;
}
```
