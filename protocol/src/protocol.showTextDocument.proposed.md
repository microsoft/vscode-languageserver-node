#### Show Text Document Request (:leftwards_arrow_with_hook:)

The show text document request is sent from the the server to the client to show the given document in a text editor.

Options can be provided to control options of the editor is being shown.

Might change the active editor.

_Request_:

* method: 'window/showTextDocumentRequest'
* params: `ShowTextDocumentRequestParams`

_Response_:
* result: `void`
* error: code and message set in case an exception happens during the 'window/showTextDocumentRequest' request

