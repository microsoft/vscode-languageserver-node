# Expanding LSP to Support Virtual File Systems

This document details a solution to creating virtual file systems in a platform agnostic way. It sits ontop of the pre-existing [language server protocol (LSP)](https://microsoft.github.io/language-server-protocol/specification), utilizing the groundwork it has laid out while building out what it means to have a general "tooling server".

## Table of Contents

- [Problem Background](#problemBackground)
- [Solution](#solution)
    - [Spec](#spec)
        - [Basic Structures](#basicStructures)
        - [Capabilities](#capabilities)
        - [Requests and Notifications](#requestsAndNotifications)

# <a href="#problemBackground" name="problemBackground">Problem Background</a>

A virtual file system can represent remote places like ftp-servers, help power embedded languages or even describe mainstream project exporers where not everything is "real". The movement to build tooling that spans ecosystems or even crosses boundaries (remote development) has proven to be difficult. Trying to generically solve the problem of how to show or maintain a virtual file system has been a delicate road of balancing fragility, dev resources and robustness. Some concrete examples today that dance along these problem boundaries are:

- LiveShare & Codespaces
- Solution/Project Explorer
- Folder explorers
- Embedded languages such as Razor, PHP, HTML etc.
- FTP

Now virtual file systems aren't entirely new. VSCode recently built out a model to enable extenders to bring their own file systems in the form of [`FileSystemProvider`](https://code.visualstudio.com/api/references/vscode-api#FileSystemProvider)s. Because of their precedent, the ideas presented in this document are heavily influenced by their design and are meant to standardize what it means for a tooling server to bring its own file system for any level of use.

# <a href="#solution" name="solution">Solution</a>

The virtual file system spec sits ontop of LSP's [Base Protocol](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#headerPart) and versioning while also expanding its [General Messages](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#initialize) for negoatiating client/server capabilities. The intent is that it's possible to have a pure file system server (tooling server) or even a language server that has file system capabilities.

The spec adds descriptive APIs to enable clients to query information of a virtual file system in order to retrieve, mutate or display content.

## <a href="#spec" name="spec">Spec</a>

### <a href="#basicStructures" name="basicStructures">Basic Structures</a>

#### <a href="#fileType" name="fileType" class="anchor">FileType</a>

The protocol currently supports several different file types and these represent what type of structures a server can virtualize.

```typescript
/**
 * Enumeration of file types. The types `File` and `Directory` can also be
 * a symbolic links, in that case use `FileType.File | FileType.SymbolicLink` and
 * `FileType.Directory | FileType.SymbolicLink`.
 */
export namespace FileType {
    /**
     * The file type is unknown.
     */
    export const Unknown = 0;

    /**
     * A regular file.
     */
    export const File = 1;

    /**
     * A directory.
     */
    export const Directory = 2;

    /**
     * A symbolic link to a file or folder
     */
    export const Symbolic = 64;
}
```

#### <a href="#fileSystemErrorType" name="fileSystemErrorType" class="anchor">fileSystemErrorType</a>

File system error types represent common error codes used to indicate failed interactions with a file system. For instance, trying to read a file that doesn't exist or edit a directory you don't have permissions to edit.

```typescript
export namespace FileSystemErrorType {
    /**
     * An error to signal that a file or folder wasn't found.
     */
    export const FileNotFound = 0;

    /**
     * An error to signal that a file or folder already exists, e.g. when creating but not overwriting a file.
     */
    export const FileExists = 1;

    /**
     * An error to signal that a file is not a folder.
     */
    export const FileNotADirectory = 2;

    /**
     * An error to signal that a file is a folder.
     */
    export const FileIsADirectory = 3;

    /**
     * An error to signal that an operation lacks required permissions.
     */
    export const NoPermissions = 4;

    /**
     * An error to signal that the file system is unavailable or too busy to complete a request.
     */
    export const Unavailable = 5;

    /**
     * A custom error.
     */
    export const Other = 1000;
}
```

### <a href="#capabilities" name="capabilities">Capabilities</a>

<a href="#fileSystemProviderClientCapabilities" name="fileSystemProviderClientCapabilities" class="anchor">_Client Capabilities:_</a>
- property name (optional): `fileSystem`
- property type: `FileSystemProviderClientCapabilities`

```typescript
/**
 * Client capabilities specific to file system providers
 */
export interface FileSystemProviderClientCapabilities {
}
```

<a href="#fileSystemProviderServerCapabilities" name="fileSystemProviderServerCapabilities" class="anchor">_Server Capability_:</a>

- property name (optional): `fileSystem`
- property type: `FileSystemProviderOptions` defined as follows:

```typescript
/**
 * Server capabilities specific to file system providers
 */
export interface FileSystemProviderOptions {
    /**
     * The uri-scheme the provider registers for
     */
    scheme: string;

    /**
     * Whether or not the file system is case sensitive.
     */
    isCaseSensitive?: boolean;

    /**
     * Whether or not the file system is readonly.
     */
    isReadonly?: boolean
}
```

_Registration Options:_ `FileSystemProviderRegistrationOptions` defined as follows:

```typescript
export interface FileSystemProviderRegistrationOptions extends FileSystemProviderOptions {
}
```

### <a href="#requestsAndNotifications" name="requestsAndNotifications">Requests and Notifications</a>

#### <a href="#didChangeFile" name="didChangeFile" class="anchor">DidChangeFile Notification (:arrow_left:)</a>

Change file notifications are sent from the server to the client to signal the change of the registered file system provider.

_Client Capabilities:_ See general file system provider [client capabilities](#fileSystemProviderClientCapabilities)

_Server Capabilities:_ See general file system provider [server capabilities](#fileSystemProviderServerCapabilities)

_Notification:_
- method: `fileSystem/didChangeFile`
- params: `DidChangeFileParams` defined as follows:

```typescript
/**
 * An event to signal that a resource has been created, changed, or deleted. This
 * event should fire for resources that are being [watched](#FileSystemProvider.watch)
 * by clients of this provider.
 *
 * *Note:* It is important that the metadata of the file that changed provides an
 * updated `mtime` that advanced from the previous value in the [stat](#FileStat) and a
 * correct `size` value. Otherwise there may be optimizations in place that will not show
 * the change in an editor for example.
 */
export interface DidChangeFileParams {
    /**
     * The change events.'
     */
    changes: FileChangeEvent[];
}

/**
 * The event filesystem providers must use to signal a file change.
 */
export interface FileChangeEvent {
    /**
     * The type of change.
     */
    uri: URI;

    /**
     * The uri of the file that has changed.
     */
    type: FileChangeType
}

/**
 * Enumeration of file change types.
 */
export namespace FileChangeType {
    /**
     * The contents or metadata of a file have changed.
     */
    export const Changed = 1;

    /**
     * A file has been created.
     */
    export const Created = 2;

    /**
     * A file has been deleted.
     */
    export const Deleted = 3;
}
```

#### <a href="#watch" name="watch" class="anchor">Watch Notification (:arrow_right:)</a>

Watch requests are sent from the client to the server to subscribe to [DidChangeFile](#didChangeFile) events in the file or folder denoted by `uri`.

_Client Capabilities:_ See general file system provider [client capabilities](#fileSystemProviderClientCapabilities)

_Server Capabilities:_ See general file system provider [server capabilities](#fileSystemProviderServerCapabilities)

_Notification:_
- method: `fileSystem/watch`
- params: `WatchParams` defined as follows:

```typescript
export interface WatchParams {
    /**
     * The uri of the file or folder to be watched.
     */
    uri: URI;

    /**
     * The subscription ID to be used in order to stop watching the provided file or folder uri via the [StopWatching](#stopWatching) notification.
     */
    subscriptionId: string;

    /**
     * Configures the watch
     */
    options: WatchFileOptions
}

export interface WatchFileOptions {
    /**
     * If a folder should be recursively subscribed to
     */
    recursive: boolean;

    /**
     * Folders or files to exclude from being watched.
     */
    excludes: string[];
}
```

#### <a href="#stopWatching" name="stopWatching" class="anchor">StopWatching Notification (:arrow_right:)</a>

A notification sent from client to server to unsubscribe from a watched file or folder.

_Client Capabilities:_ See general file system provider [client capabilities](#fileSystemProviderClientCapabilities)

_Server Capabilities:_ See general file system provider [server capabilities](#fileSystemProviderServerCapabilities)

_Notification:_
- method: `fileSystem/stopWatching`
- params: `StopWatchingParams` defined as follows:

```typescript
/**
 * A notification to signal an unsubscribe from a corresponding [watch](#watch) request.
 */
export interface StopWatchingParams {
    /**
     * The subscription id.
     */
    subscriptionId: string;
}
```

#### <a href="#stat" name="stat" class="anchor">Stat Request (:arrow_right_hook:)</a>

Stat requests are sent from the client to the server to request metadata about a URI.

_Client Capabilities:_ See general file system provider [client capabilities](#fileSystemProviderClientCapabilities)

_Server Capabilities:_ See general file system provider [server capabilities](#fileSystemProviderServerCapabilities)

_Request:_
- method: `fileSystem/stat`
- params: `FileStatParams` defined as follows:

```typescript
export interface FileStatParams {
    /**
     * The uri to retrieve metadata about.
     */
    uri: URI;
}
```

_Response:_
- result: `FileStatResponse`
- error: code and message set in case an exception during the `fileSystem/stat` request. Code will be of type [FileSystemErrorType](#fileSystemErrorType) with an associated message.

```typescript
export interface FileStatResponse {
    /**
     * The type of the file, e.g. is a regular file, a directory, or symbolic link
     * to a file/directory.
     *
     * *Note:* This value might be a bitmask, e.g. `FileType.File | FileType.SymbolicLink`.
     */
    type: FileType;

    /**
     * The creation timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
     */
    ctime: number;

    /**
     * The modification timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
     *
     * *Note:* If the file changed, it is important to provide an updated `mtime` that advanced
     * from the previous value. Otherwise there may be optimizations in place that will not show
     * the updated file contents in an editor for example.
     */
    mtime: number;

    /**
     * The size in bytes.
     *
     * *Note:* If the file changed, it is important to provide an updated `size`. Otherwise there
     * may be optimizations in place that will not show the updated file contents in an editor for
     * example.
     */
    size: uinteger;
}
```

#### <a href="#readDirectory" name="readDirectory" class="anchor">ReadDirectory Request (:arrow_right_hook:)</a>

Read directory requests are sent from the client to the server to retrieve all entries of a directory.

_Client Capabilities:_ See general file system provider [client capabilities](#fileSystemProviderClientCapabilities)

_Server Capabilities:_ See general file system provider [server capabilities](#fileSystemProviderServerCapabilities)

_Request:_
- method: `fileSystem/readDirectory`
- params: `ReadDirectoryParams` defined as follows:

```typescript
export interface ReadDirectoryParams {
    /**
     * The uri of the folder.
     */
    uri: URI;
}
```

_Response:_
- result: `ReadDirectoryResponse`

```typescript
export interface ReadDirectoryResponse {
    /**
     * An array of nodes that represent the directories children.
     */
    children: DirectoryChild[]
}

/**
 * A name/type item that represents a directory child node.
 */
export interface DirectoryChild {
    /**
     * The name of the node, e.g. a filename or directory name.
     */
    name: string;

    /**
     * The type of the file, e.g. is a regular file, a directory, or symbolic link to a file/directory.
     *
     * *Note:* This value might be a bitmask, e.g. `FileType.File | FileType.SymbolicLink`.
     */
    type: FileType;
}
```

#### <a href="#createDirectory" name="createDirectory" class="anchor">CreateDirectory Request (:arrow_right_hook:)</a>

Create directory requests are sent from the client to the server to create a new directory.

_Client Capabilities:_ See general file system provider [client capabilities](#fileSystemProviderClientCapabilities)

_Server Capabilities:_ See general file system provider [server capabilities](#fileSystemProviderServerCapabilities)

_Request:_
- method: `fileSystem/createDirectory`
- params: `CreateDirectoryParams` defined as follows:

```typescript
export interface CreateDirectoryParams {
    /**
     * The uri of the folder
     */
    uri: URI;
}
```

_Response:_
- result: void
- error: code and message set in case an exception during the `fileSystem/createDirectory` request. Code will be of type [FileSystemErrorType](#fileSystemErrorType) with an associated message.

#### <a href="#readFile" name="readFile" class="anchor">ReadFile Request (:arrow_right_hook:)</a>

Read file requests are sent from the client to the server to retrieve the content of a file.

_Client Capabilities:_ See general file system provider [client capabilities](#fileSystemProviderClientCapabilities)

_Server Capabilities:_ See general file system provider [server capabilities](#fileSystemProviderServerCapabilities)

_Request:_
- method: `fileSystem/readFile`
- params: `ReadFileParams` defined as follows:

```typescript
export interface ReadFileParams {
    /**
     * The uri of the folder
     */
    uri: URI;
}
```

_Response:_
- result: `ReadFileResponse`
- error: code and message set in case an exception during the `fileSystem/readFile` request. Code will be of type [FileSystemErrorType](#fileSystemErrorType) with an associated message.

```typescript
export interface ReadFileResponse {
    /**
     * The entire contents of the file `base64` encoded.
     */
    content: string;
}
```

#### <a href="#writeFile" name="writeFile" class="anchor">WriteFile Request (:arrow_right_hook:)</a>

Write file requests are sent from the client to the server to write data to a file, replacing its entire contents.

_Client Capabilities:_ See general file system provider [client capabilities](#fileSystemProviderClientCapabilities)

_Server Capabilities:_ See general file system provider [server capabilities](#fileSystemProviderServerCapabilities)

_Request:_
- method: `fileSystem/writeFile`
- params: `WriteFileParams` defined as follows:

```typescript
export interface WriteFileParams {
    /**
     * The uri of the file to write
     */
    uri: URI;

    /**
     * The new content of the file `base64` encoded.
     */
    content: string;

    /**
     * Options to define if missing files should or must be created.
     */
    options: WriteFileOptions
}

export interface WriteFileOptions {
    /**
     * If a new file should be created.
     */
    create: boolean;

    /**
     * If a pre-existing file should be overwritten.
     */
    overwrite: boolean;
}
```

_Response:_
- result: void
- error: code and message set in case an exception during the `fileSystem/writeFile` request. Code will be of type [FileSystemErrorType](#fileSystemErrorType) with an associated message.

#### <a href="#delete" name="delete" class="anchor">Delete Request (:arrow_right_hook:)</a>

Delete requests are sent from the client to the server to delete a file or folder.

_Client Capabilities:_ See general file system provider [client capabilities](#fileSystemProviderClientCapabilities)

_Server Capabilities:_ See general file system provider [server capabilities](#fileSystemProviderServerCapabilities)

_Request:_
- method: `fileSystem/delete`
- params: `DeleteFileParams` defined as follows:

```typescript
export interface DeleteFileParams {
    /**
     * The uri of the file or folder to delete
     */
    uri: URI;

    /**
     * Defines if deletion of folders is recursive.
     */
    options: DeleteFileOptions
}

export interface DeleteFileOptions {
    /**
     * If a folder should be recursively deleted.
     */
    recursive: boolean;
}
```

_Response:_
- result: void
- error: code and message set in case an exception during the `fileSystem/delete` request. Code will be of type [FileSystemErrorType](#fileSystemErrorType) with an associated message.

#### <a href="#rename" name="rename" class="anchor">Rename Request (:arrow_right_hook:)</a>

Rename requests are sent from the client to the server to rename a file or folder.

_Client Capabilities:_ See general file system provider [client capabilities](#fileSystemProviderClientCapabilities)

_Server Capabilities:_ See general file system provider [server capabilities](#fileSystemProviderServerCapabilities)

_Request:_
- method: `fileSystem/rename`
- params: `RenameFileParams` defined as follows:

```typescript
export interface RenameFileParams {
    /**
     * The existing file.
     */
    oldUri: URI;

    /**
     * The new location.
     */
    newUri: URI;

    /**
     * Defines if existing files should be overwritten.
     */
    options: RenameFileOptions
}

export interface RenameFileOptions {
    /**
     * If existing files should be overwritten.
     */
    overwrite: boolean;
}
```

_Response:_
- result: void
- error: code and message set in case an exception during the `fileSystem/rename` request. Code will be of type [FileSystemErrorType](#fileSystemErrorType) with an associated message.
