#### Selection Range Request (:leftwards_arrow_with_hook:)

The selection range request is sent from the client to the server to return suggested selection ranges at a given position.
A selection range is a range around the cursor position which the user might be interested in selecting.
Typically, but not neccessary, selection ranges correspond to the nodes of the syntax tree.
The first range must contain the given position.
Position can coincide with the start or end of the first range.
Subsequent ranges must contain the previous range.

_Request_:

* method: 'textDocument/selectionRange'
* params: `TextDocumentPositionParams`

_Response_:
* result: `SelectionRange[] | null`: a list of selection ranges
* error: code and message set in case an exception happens during the 'textDocument/selectionRange' request

