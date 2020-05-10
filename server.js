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
let index_counter;
let chosen_cards={};
let guesses={};
let scores={};
//let welcom = true;  //welcom = true if new gamers are welcomed, = false if the game already started

app.use(express.static('cartes'));
// Chargement du fichier pseudo.html affiché au client
app.get('/', function(req, res) {
    fs.readFile('views/dixit.html', function(error, content) {
    	if(error) throw error;
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
})
.get('/cartes/:nom', function(req, res){
	if(req.params.nom.match(/^[0-9]+\.png$/g)){
		console.log("carte "+req.params.nom+" demandée");
		fs.readFile('cartes/'+req.params.nom, function(error, content) {
			res.writeHead(200, {"Content-Type": "image/png"});
			res.end(content);
		});
	}
});



a_defausser = [];
io.sockets.on('connection', function (socket, pseudo) {

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session
    socket.on('pseudo', function(pseudo) {
        socket.pseudo = pseudo;
        var pseudo_ok = check_pseudo(pseudo);
        if(pseudo_ok) {
          console.log(pseudo + " vient de se connecter.");
          
          if(players.length == 0){
            chef = pseudo;
            //socket.emit('leader');
            socket.emit('new_leader', chef);
            socket.broadcast.emit('new_leader', chef);
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

    socket.on('start_game', function() {
      socket.emit('change_view', "C");
      socket.broadcast.emit('change_view', "C");
      index_counter = 0;
      socket.emit('counter', socket.pseudo);
      socket.broadcast.emit('counter', socket.pseudo);
    });


    socket.on('log-message', function(message) {
      console.log(message)
    });

    socket.on('tirage', function(){
    	socket.main = gestionCartes.tirerCartes(6);
      socket.emit('tirage', socket.main);
    });



    socket.on('defausser', function(){
    	gestionCartes.defausserCartes(a_defausser);
    });

    socket.on('counter_choice', function(card, key_phrase) {
      chosen_cards[counter] = card;
      a_defausser.push(card);
      
      socket.emit('reveal_counter_choice', card, key_phrase);
      socket.broadcast.emit('reveal_counter_choice', card, key_phrase);
    });

    socket.on('guesser_card_to_play', function(card) {
      chosen_cards[socket.pseudo]=card;
      a_defausser.push(card);
      if(Object.keys(chosen_cards).length==players.length){
        socket.emit('change_view', "D");
        socket.broadcast.emit('change_view', "D");
        socket.emit('start_guessing', players.length, a_defausser);
      }
    })

    socket.on('guesser_choice', function(pseudo, card) {
      guesses[pseudo]=card;
      if(Object.keys(guesses).length==players.length){
        computeScores();
        socket.emit('change_view', "E");
        socket.emit('scores', scores);
      }
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

function next_counter() {
  index_counter = (index_counter + 1) % players.length;
  return players[index_counter];
}