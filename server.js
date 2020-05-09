const http = require('http');
const fs = require('fs');
const express = require('express');

const app = require('express')();
const server = require('http').Server(app);
// Chargement de socket.io
const io = require('socket.io')(server);

var players = [];

// Chargement du fichier index.html affiché au client
app.get('/', function(req, res) {
    fs.readFile('views/pseudo.html', 'utf-8', function(error, content) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
});

app.get('/waiting_room', function(req, res) {
    res.render('waiting_room.ejs', {players: players});
});



io.sockets.on('connection', function (socket, pseudo) {
    
    // Quand un client se connecte, on lui envoie un message
    //socket.emit('message', 'Vous êtes bien connecté !');

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session
    socket.on('pseudo', function(pseudo) {
        socket.pseudo = pseudo;
        console.log(pseudo + " vient de se connecter.");
        players.push(pseudo);
        // On signale aux autres clients qu'il y a un nouveau venu
        socket.broadcast.emit('new_player', pseudo);

        const destination = '/waiting_room';
        socket.emit('redirect', destination);

    });

    socket.on('disconnect', function(){
    	console.log(socket.pseudo+" vient de se déconnecter.");
    })

});


// Ecoute sur le port 50000
server.listen(50000);