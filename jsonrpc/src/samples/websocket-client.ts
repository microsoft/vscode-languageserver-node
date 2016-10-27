import * as SocketIOClient from 'socket.io-client';

let opts = {
    transports: ['websocket'],
    upgrade: false
};
let ws = SocketIOClient.connect('ws://localhost:8080/jsonrpc', opts);


let messages_samples = [
    {
        'Content-Length': '',
        'body': {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "textDocument/didOpen",
            "params": {

            }
        }
    }
]

ws.on('connect', () => {
    console.log('client connected');

    let jsonrpc_message = messages_samples[0];
    ws.emit('jsonrpc', jsonrpc_message, (reply) => {
        console.log('emit:jsonrpc - reply - ', reply);
    });
});
