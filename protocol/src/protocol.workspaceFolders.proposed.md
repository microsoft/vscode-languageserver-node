#### Workspace Folders

Many tools support more than one root folder per workspace. Examples for this are VS Code's multi-root support, Atom's project folder support or Sublime's project support. If a client workspace consists of multiple roots then a server typically needs to know about this. The protocol up to know assumes one root folder which is announce to the server by the `rootUri` property of the `InitializeParams`. For workspace folders the following additions are proposed:

_InitializeParams_:

An additional property `workspaceFolders` which contain the configured workspace folders when the server starts.


_Client Capabilities_:

The client sets the following capability if it is supporting workspace folders.

```ts
/**
 * The workspace client capabilities
 */
workspace: {
	/**
	 * The client has support for workspace folders
	 */
	workspaceFolders?: boolean;
}
```

_Server Capabilities_:

The server sets the following capability if it is supporting workspace folders.

```ts
/**
 * The workspace server capabilities
 */
workspace: {
	/**
	 * The server has support for workspace folders
	 */
	workspaceFolders?: boolean;
}
```

_Model_:

```ts
/**
 * The actual configured workspace folders.
 */
workspaceFolders: WorkspaceFolder[] | null;
```

where a `WorkspaceFolder` is defined as follows:

```ts
export interface WorkspaceFolder {
	/**
	 * The associated URI for this workspace folder.
	 */
	uri: string;

	/**
	 * The name of the workspace folder. Defaults to the
	 * uri's basename.
	 */
	name: string;
}
```

##### Workspace Folders Request

The `workspace/workspaceFolders` request is sent from the server to the client to fetch the current open list of workspace folders. Returns `null` in the response if only a single file is open in the tool. Returns an empty array if a workspace is open but no folders are configured.

_Request_:

* method: 'workspace/workspaceFolders'
* params: none

_Response_:

* result: `WorkspaceFolder[] | null`
* error: code and message set in case an exception happens during the 'workspace/workspaceFolders' request

##### DidChangeWorkspaceFolders Notification

The `workspace/didChangeWorkspaceFolders` notification is sent from the client to the server to inform the server about workspace folder configuration changes. The notification is sent by default if both _ServerCapabilities/workspace/workspaceFolders_ and _ClientCapabilities/workapce/workspaceFolders_ are true; or if the server has registered to receive this notification it first. To register for the `workspace/didChangeWorkspaceFolders` send a `client/registerCapability` request from the client to the server. The registration parameter must have a `registrations` item of the following form, where `id` is a unique id used to unregister the capability (the example uses a UUID):
```ts
{
	id: "28c6150c-bd7b-11e7-abc4-cec278b6b50a",
	method: "workspace/didChangeWorkspaceFolders"
}
```

_Notification_:

* method: 'workspace/didChangeWorkspaceFolders'
* params: `DidChangeWorkspaceFoldersParams` defined as follows:

```ts
export interface DidChangeWorkspaceFoldersParams {
	/**
	 * The actual workspace folder change event.
	 */
	event: WorkspaceFoldersChangeEvent;
}

/**
 * The workspace folder change event.
 */
export interface WorkspaceFoldersChangeEvent {
	/**
	 * The array of added workspace folders
	 */
	added: WorkspaceFolder[];

	/**
	 * The array of the removed workspace folders
	 */
	removed: WorkspaceFolder[];
}
```

