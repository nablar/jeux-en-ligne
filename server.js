const http = require('http');
const fs = require('fs');
const express = require('express');

const app = require('express')();
const server = require('http').Server(app);
// Chargement de socket.io
const io = require('socket.io')(server);

const session = require('express-session') ({
  secret:'dixit',
  resave:true,
  saveUninitialized:true
})

const sharedsession = require("express-socket.io-session");

app.use(session);

var players = [];
var chef; 

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


io.use(sharedsession(session, { 
  autoSave:true
}));

io.sockets.on('connection', function (socket, pseudo) {

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session
    socket.on('pseudo', function(pseudo) {
        socket.handshake.session.pseudo = pseudo;
        socket.handshake.session.save();
        var pseudo_ok = check_pseudo(pseudo);
        if(pseudo_ok) {
          console.log(pseudo + " vient de se connecter.");
          if(players.length == 0){
            chef = pseudo;
          }
          players.push(pseudo);
          // On signale aux autres clients qu'il y a un nouveau venu
          socket.broadcast.emit('new_player', pseudo);

          const destination = '/waiting_room';
          socket.emit('redirect', destination);
        }
        else {
          socket.emit('message', "Ce pseudo est déjà pris, choisis-en un autre.")
        }

    });

    socket.on('ask_pseudo', function(){
      socket.emit('send_pseudo', socket.handshake.session.pseudo);
    })

    socket.on('disconnect', function(){
    	console.log(socket.handshake.session.pseudo + " vient de se déconnecter.");
    })

});



// Ecoute sur le port 50000
server.listen(50000);


function check_pseudo(pseudo) {
  if(pseudo=='') {
    return false;
  }
  for(var i = 0 ; i < players.length ; i++) {
    if(pseudo == players[i]) {
      return false;
    }
  }
  return true;
}