#### Selection Range Request (:leftwards_arrow_with_hook:)

The selection range request is sent from the client to the server to return suggested selection ranges at an array of given positions. A selection range is a range around the cursor position which the user might be interested in selecting.

A selection range in the return array is for the position in the provided parameters at the same index. Therefore positions[i] must be contained in result[i].range.

Typically, but not necessary, selection ranges correspond to the nodes of the syntax tree.

_Request_:

* method: 'textDocument/selectionRange'
* params: `SelectionRangeParams`

_Response_:
* result: `SelectionRange[] | null`: a list of selection ranges
* error: code and message set in case an exception happens during the 'textDocument/selectionRange' request

