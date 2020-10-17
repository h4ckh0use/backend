import WebSocket from 'ws';
import http from 'http';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const users = {}
const connections = {}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
    console.log('New Connection opened')
    const uuid = uuidv4();
    console.log('New user UUID:', uuid)
    ws.uuid = uuid
    connections[uuid] = ws
    ws.send('Successful connection!')

    ws.on('message', message => {
        let data;
        console.log(`New message from ${ws.uuid}:\n    ${message}`)
        try {
            data = JSON.parse(message) // {"command":"newUser","something":"Hi"}
        } catch (e) {
            console.log('Message had invalid JSON')
        }
        console.log(data)
        broadcast(message);
    });

    ws.on('close', ws => {
        console.log('Connection closed')
        // close user connection
    });
});

// start our server
server.listen(process.env.PORT || 1337, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});

const disonnect = (ws) => {
    const uuid = ws.uuid
    if (connections[uuid]) {
        console.log('Disonnect:', users[uuid].name)

        delete connections[uuid]
        delete users[uuid]

        // update all clients' user name list

        console.log(users)
    } else {
        console.log('Attempt to disconnect null user:', uuid)
        ws.send(JSON.stringify({ command: 'failed' }))
    }
}

const broadcast = (message) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}