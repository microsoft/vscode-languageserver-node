import * as SocketIO from 'socket.io';

let opts = {
    transports: ['websocket'],
    upgrade: false
};
let ws = SocketIO(8080, opts);

ws.of('/jsonrpc').on('connection', (socket) => {
    console.log('server connected');

    ws.emit('this', { will: 'be received by everyone' });

    socket.on('jsonrpc', (jsonrpc_message) => {
        // textDocument
        console.log('on:jsonrpc - ', jsonrpc_message);
    });

    socket.on('disconnect', () => {
        ws.emit('user disconnected');
    });
});
