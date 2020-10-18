const WebSocket = require('ws')
const https = require('https')
const http = require('http')
const express = require('express')
const { v4: uuidv4 } = require('uuid')

const firebase = require('firebase/app');
require('firebase/firestore');

const connections = {}
const users = {}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get('/', (req, res) => {
    res.send('The backend is running. Visit the web app <a href="https://hackhouse-40180.web.app/">here</a>')
})

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
    updateUsers()

    ws.on('message', message => {
        let data;
        console.log(`New message from ${ws.uuid}:\n    ${message}`)
        try {
            data = JSON.parse(message) // {"command":"newUser","something":"Hi"}
        } catch (e) {
            console.log('Message had invalid JSON')
        }

        if (data.newUser) {
            ws.username = data.username
            users[data.username] = data.color
            updateUsers();
        }

        if (data.getUsers) {
            updateUsers();
        }

        console.log(data)
        broadcast(message);
    });

    ws.on('close', () => {
        console.log(`Connection closed ${ws.uuid}`)
        // close user connection
        delete connections[ws.uuid];
        delete users[ws.username];
        if (ws.username) {
            broadcast(JSON.stringify({ broadcast: true, message: `${ws.username} has left` }))
            updateUsers();
        }
    });
});

// start our server
server.listen(process.env.PORT || 1337, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});

const updateUsers = () => {
    console.log(JSON.stringify(users, null, 4))
    broadcast(JSON.stringify({
        updateUserList: true,
        users
    }))
}

const broadcast = (message) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// timer management
const firebaseConfig = {
    apiKey: 'AIzaSyD-OBa_D5u6_3SKQPCN421FTsSjIZlhd3g',
    authDomain: 'hackhouse-40180.firebaseapp.com',
    databaseURL: 'https://hackhouse-40180.firebaseio.com',
    projectId: 'hackhouse-40180',
    storageBucket: 'hackhouse-40180.appspot.com',
    messagingSenderId: '688457122022',
    appId: '1:688457122022:web:abd70e49ab332b026b7b27',
    measurementId: 'G-HVBVV95GHF',
}

firebase.initializeApp(firebaseConfig)
const db = firebase.firestore()
let prev = false;

// check timer
function setInactive() {
    db.collection('room').doc('kvOJ1KrHegxsTyM5AONv').update({
        active: false,
    })
}

db.collection('room').doc('kvOJ1KrHegxsTyM5AONv').onSnapshot(doc => {
    const d = doc.data()
    const timerPeriod = d.current === 'work' ? d.workTime : d.breakTime
    const timerPeriodms = timerPeriod * 60 * 1000

    // active has just been toggled, find new state
    if (d.active != prev) {
        if (d.active) {
            // increment timer
            db.collection('room').doc('kvOJ1KrHegxsTyM5AONv').update({
                timer: new Date((new Date()).getTime() + timerPeriodms),
            })

            // set timeout to clear active after time period
            setTimeout(() => {
                setInactive();
            }, timerPeriodms);
        } else {
            // toggle current
            db.collection('room').doc('kvOJ1KrHegxsTyM5AONv').update({
                timer: new Date(),
                current: d.current === 'work' ? 'break' : 'work',
            })
        }
    }
    prev = d.active
})