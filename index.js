import WebSocket from 'ws';
import https from 'https';
import http from 'http';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const connections = {}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

setInterval(function () {
    https.get("https://hackhouse-backend.herokuapp.com/");
    console.log('hackhouse pinged');
}, 600000);

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
        console.log(`Connection closed ${ws.uuid}`)
        // close user connection
        delete connections[ws.uuid];
    });
});

// start our server
server.listen(process.env.PORT || 1337, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});

const broadcast = (message) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}