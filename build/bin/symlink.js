#!/usr/bin/env node

let path = require('path');
let fs = require('fs');
let shell = require('shelljs');

let root = path.dirname(path.dirname(__dirname));
let options = '-rf';

function tryLink(module, name, source) {
    let current = process.cwd();
    try {
        process.chdir(path.join(module, 'node_modules'));
        if (fs.existsSync(name)) {
            shell.rm(options, name);
            shell.ln('-s', path.join('..', '..', source), name);
        }
    } finally {
        process.chdir(current);
    }
}

function tryLinkJsonRpc(module) {
    tryLink(module, 'vscode-jsonrpc', 'jsonrpc');
}

function tryLinkTypes(module) {
    tryLink(module, 'vscode-languageserver-types', 'types');
}

function tryLinkProtocol(module) {
    tryLink(module, 'vscode-languageserver-protocol', 'protocol');
}

console.log('Symlinking node modules for development setup');

// protocol folder
let protocolFolder = path.join(root, 'protocol');
tryLinkJsonRpc(protocolFolder);
tryLinkTypes(protocolFolder);

// server folder
let serverFolder = path.join(root, 'server');
tryLinkJsonRpc(serverFolder);
tryLinkTypes(serverFolder);
tryLinkProtocol(serverFolder);

// client folder
let clientFolder = path.join(root, 'client');
tryLinkJsonRpc(clientFolder);
tryLinkTypes(clientFolder);
tryLinkProtocol(clientFolder);
