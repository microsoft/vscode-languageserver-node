# VSCode Language Server Node - Project Explanation

## Overview

The **VSCode Language Server Node** repository is Microsoft's official implementation of the Language Server Protocol (LSP) for Node.js. It provides the foundational infrastructure that enables Visual Studio Code extensions to implement language intelligence features (like autocomplete, go-to-definition, find-references, etc.) in a standardized way.

## What is the Language Server Protocol (LSP)?

The Language Server Protocol is a standardized protocol created by Microsoft that defines how code editors/IDEs communicate with language servers. Before LSP:
- Each IDE needed custom integrations for each programming language
- Language tool developers had to write different plugins for each IDE
- This resulted in an M×N problem (M languages × N editors)

With LSP:
- Language servers provide language intelligence features via a standard protocol
- IDEs implement the LSP client once and can work with any LSP server
- This reduces the problem to M+N (M language servers + N editor clients)

## Repository Structure

This monorepo contains six main NPM packages that work together:

### 1. **vscode-jsonrpc** (`/jsonrpc`)
- **Purpose**: The lowest-level messaging layer
- **What it does**: Implements JSON-RPC 2.0 protocol for communication between client and server
- **Key features**:
  - Message reading/writing over various transports (stdio, sockets, IPC)
  - Request/response handling
  - Notification handling
  - Connection management

### 2. **vscode-languageserver-types** (`/types`)
- **Purpose**: Common data structures
- **What it does**: Defines TypeScript types and interfaces used throughout LSP
- **Examples**: `Position`, `Range`, `Diagnostic`, `CompletionItem`, `Hover`, etc.
- **Why separate**: Shared between client and server to ensure type consistency

### 3. **vscode-languageserver-protocol** (`/protocol`)
- **Purpose**: LSP specification implementation
- **What it does**: Implements the actual Language Server Protocol specification in TypeScript
- **Key features**:
  - Protocol message definitions
  - Request/notification type definitions
  - Capability negotiation structures
  - Meta-model of the protocol (machine-readable specification)

### 4. **vscode-languageserver-textdocument** (`/textDocument`)
- **Purpose**: Text document abstraction
- **What it does**: Provides an in-memory representation of text documents with incremental updates
- **Key features**:
  - Full and incremental document synchronization
  - Position/offset calculations
  - Line-based text operations

### 5. **vscode-languageserver** (`/server`)
- **Purpose**: Server-side implementation
- **What it does**: Provides the framework for implementing a language server
- **Key features**:
  - Connection setup and lifecycle management
  - Document management
  - Feature registration (diagnostics, completion, hover, etc.)
  - Works with Node.js runtime
  - Can be used in browser environments via webpack

### 6. **vscode-languageclient** (`/client`)
- **Purpose**: Client-side implementation for VS Code extensions
- **What it does**: Provides the VS Code extension side that communicates with language servers
- **Key features**:
  - Automatic language server process management
  - Protocol message conversion
  - VS Code API integration
  - Middleware support for customization
  - Error handling and restart strategies

## How It All Works Together

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          vscode-languageclient                        │  │
│  │  (LanguageClient - manages server process)           │  │
│  └───────────────────┬───────────────────────────────────┘  │
└──────────────────────┼──────────────────────────────────────┘
                       │ (uses vscode-languageserver-protocol)
                       │ (uses vscode-jsonrpc for transport)
                       │
                       ↓ JSON-RPC over stdio/socket/IPC
                       │
┌──────────────────────┼───────────────────────────────────────┐
│                      │         Language Server Process       │
│  ┌───────────────────┴───────────────────────────────────┐  │
│  │         vscode-languageserver                         │  │
│  │  (Connection, TextDocuments, feature handlers)       │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                       │
│  ┌───────────────────┴───────────────────────────────────┐  │
│  │    Your Language Implementation                       │  │
│  │  (parse code, provide completions, diagnostics, etc.) │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘

        Both sides use:
        - vscode-languageserver-types (data structures)
        - vscode-languageserver-protocol (protocol definitions)
        - vscode-jsonrpc (message transport)
```

## Common Use Cases

### 1. **Building a Language Server**
If you're creating a new language server:
1. Install `vscode-languageserver` and `vscode-languageserver-textdocument`
2. Create a server that handles LSP requests
3. Implement handlers for language features (completion, hover, diagnostics, etc.)
4. Example: TypeScript language server, Python language server (Pylance)

### 2. **Building a VS Code Extension with Language Support**
If you're creating a VS Code extension that uses a language server:
1. Install `vscode-languageclient`
2. Create a `LanguageClient` instance in your extension
3. Configure how to start the server (executable path, arguments)
4. The client handles all protocol communication automatically

### 3. **Extending Existing Language Servers**
Use the protocol definitions to:
- Add custom requests/notifications
- Implement proposed protocol features
- Create middleware for message interception

## Key Features Supported

The protocol and implementations support:

**Core Features:**
- Text document synchronization
- Diagnostics (errors, warnings)
- Code completion with snippets
- Hover information
- Signature help
- Go to definition/declaration/implementation
- Find references
- Document highlights
- Document symbols
- Workspace symbols
- Code actions (quick fixes, refactorings)
- Code lenses
- Document formatting
- Range formatting
- On-type formatting
- Rename

**Advanced Features:**
- Folding ranges
- Selection ranges
- Document links
- Document colors
- Semantic tokens
- Call hierarchy
- Type hierarchy
- Inline values
- Inlay hints
- Inline completions
- Notebook documents
- Workspace edits with file operations

## Building and Development

### Prerequisites
- Node.js 22+ (uses ES2022 features)
- npm package manager
- TypeScript 5.9.x

### Setup
```bash
# Clone the repository
git clone https://github.com/microsoft/vscode-languageserver-node.git
cd vscode-languageserver-node

# Install dependencies
npm install

# Create symlinks between packages
npm run symlink

# Compile all packages
npm run compile

# Run tests
npm run test
```

### Project Structure
- **Monorepo**: All packages are in the same repository
- **TypeScript**: Written entirely in TypeScript
- **Build System**: Uses TypeScript's project references for efficient builds
- **Module System**: Uses ES modules with proper `exports` in package.json
- **Browser Support**: Split into common/node/browser implementations

## Version History Highlights

### Current (10.0.0-next)
- TypeScript 5.9.x
- Node.js 22.13.14
- ES2022 target
- Uses package.json `exports` instead of `main`
- Breaking changes in notification handlers (can now return promises)
- `LogOutputChannel` instead of `OutputChannel`

### Version 9.0.0
- Inline completion support
- Formatting ranges
- Various bug fixes

### Version 8.0.0
- Async `start()` and `stop()` methods
- Handler registration before client start
- All `sendNotification` methods return promises
- Improved error handling

### Version 3.17.0 (Protocol)
- Inline values
- Inlay hints
- Type hierarchies
- Notebook documents

## Real-World Usage

This codebase powers language support in VS Code for many languages:
- **TypeScript/JavaScript**: VS Code's built-in TypeScript server
- **Python**: Pylance extension
- **C/C++**: Microsoft C/C++ extension
- **Java**: Red Hat's Java extension
- **Go**: Go extension
- And hundreds more community extensions

## Documentation and Resources

- **Official LSP Specification**: https://microsoft.github.io/language-server-protocol/
- **VS Code Extension Guide**: https://code.visualstudio.com/docs/extensions/example-language-server
- **NPM Packages**: All published to npmjs.org with `vscode-languageserver*` or `vscode-languageclient` names
- **Build Status**: Azure Pipelines CI/CD
- **License**: MIT

## Contributing

After cloning:
1. `npm install` - Install dependencies
2. `npm run symlink` - Link local packages together
3. Make changes
4. `npm run compile` - Compile TypeScript
5. `npm run test` - Run tests
6. `npm run lint` - Check code style

## Architecture Principles

1. **Separation of Concerns**: Each package has a specific responsibility
2. **Protocol First**: Implementation follows the LSP specification strictly
3. **Transport Agnostic**: Works over stdio, sockets, IPC, or web workers
4. **Environment Support**: Works in Node.js and browser environments
5. **Type Safety**: Full TypeScript type coverage
6. **Backward Compatibility**: Careful versioning to avoid breaking changes
7. **Performance**: Efficient message handling and async operations

## Summary

The VSCode Language Server Node project is the reference implementation of LSP for Node.js/JavaScript ecosystems. It provides:
- A complete, production-ready implementation of the Language Server Protocol
- Reusable packages for building both language servers and VS Code clients
- Cross-platform, cross-environment support (Node.js and browsers)
- The foundation for hundreds of language extensions in VS Code
- A standardized way to bring language intelligence to any programming language

Whether you're building a new language server, integrating one into VS Code, or contributing to the LSP ecosystem, this repository provides all the tools you need.
