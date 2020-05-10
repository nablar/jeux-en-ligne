const http = require('http');
const fs = require('fs');
const express = require('express');
const gestionCartes = require('./gestion_cartes');

const app = require('express')();
const server = require('http').Server(app);
// Chargement de socket.io
const io = require('socket.io')(server);

let players = [];
let chef; 

// Chargement du fichier pseudo.html affiché au client
app.get('/', function(req, res) {
    fs.readFile('views/dixit.html', 'utf-8', function(error, content) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
});


io.sockets.on('connection', function (socket, pseudo) {

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session
    socket.on('pseudo', function(pseudo) {
        socket.pseudo = pseudo;
        var pseudo_ok = check_pseudo(pseudo);
        if(pseudo_ok) {
          console.log(pseudo + " vient de se connecter.");
          
          if(players.length == 0){
            chef = pseudo;
            socket.emit('leader');
          }
          players.push(pseudo);

          socket.emit('change_view', "B");
          socket.emit('players_list', players);
          // On signale aux autres clients qu'il y a un nouveau venu
          socket.broadcast.emit('players_list', players);
          
          
        }
        else {
          socket.emit('message', "Ce pseudo est déjà pris, choisis-en un autre.")
        }

    });

    socket.on('disconnect', function(){
    	console.log(socket.pseudo + " vient de se déconnecter.");
      let index;
      for(var i = 0 ; i < players.length ; i++) {
        if(socket.pseudo == players[i]) {
          index=i;
        }
      }
      players.splice(index,1);
      socket.broadcast.emit('players_list', players);

      if(socket.pseudo==chef) {
        chef = players[0];
        socket.broadcast.emit('new_leader', chef);
        console.log("le nouveau chef est " + chef);
      }
    });

    socket.on('log-message', function(message) {
      console.log(message)
    });

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