#### Selection Range Request (:leftwards_arrow_with_hook:)

The selection range request is sent from the client to the server to return suggested selection ranges at given positions.
A selection range is a range around the cursor position which the user might be interested in selecting.
Typically, but not necessary, selection ranges correspond to the nodes of the syntax tree.

Selection ranges should be computed independently for each position. Ranges for
a specific position should form hierarchy: each range has an optional, strictly
larger, parent range.

_Request_:

* method: 'textDocument/selectionRange'
* params: `SelectionRangeParams`

_Response_:
* result: `SelectionRange[] | null`: a list of selection ranges
* error: code and message set in case an exception happens during the 'textDocument/selectionRange' request

