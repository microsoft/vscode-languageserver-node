#### Get Symbol Moniker (textDocument/moniker)

Language Server Index Format (LSIF) introduced the concept of symbol monikers to help associate symbols across different indexes. This request adds capability for LSP server implementations to provide the same symbol moniker information given a text document position. Clients can utilize this method to get the moniker at the current location in a file user is editing and do further code navigation queries in other services that rely on LSIF indexes and link symbols together.

_Client Capabilities_:

\`\`\`ts
/**
 * Moniker client capabilities
 */
textDocument?: {
	/**
	 * The client has support for moniker options.
	 */
	moniker?: {
        dynamicRegistration?: boolean;
    }
}
\`\`\`

_InitializeParams_:

No new initialization parameters are required.

##### Moniker Request

The `textDocument/moniker` request is sent from the client to the server to get the symbol monikers for a given text document position. An array of Moniker types is returned as response to indicate possible monikers at the given location. If no monikers can be calculated, an empty array should be returned.

_Request_:

* method: 'textDocument/moniker'
* params: `TextDocumentPositionParams`

_Response_:

* result: `Moniker[]`

##### Notes

Server implementations of this method should ensure that the moniker calculation matches to those used in the corresponding LSIF implementation to ensure symbols can be associated correctly across IDE sessions and offline indexes.
