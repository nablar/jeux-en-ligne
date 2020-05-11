const http = require('http');
const fs = require('fs');
const express = require('express');
const gestionCartes = require('gestion_cartes');
const gestionScores = require('gestion_scores');

const app = require('express')();
const server = require('http').Server(app);
// Chargement de socket.io
const io = require('socket.io')(server);

let players = [];
let chef; 
let counter;
let index_counter;
let chosen_cards={};
let guesses={};
let scores;
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
		fs.readFile('cartes/'+req.params.nom, function(error, content) {
			res.writeHead(200, {"Content-Type": "image/png"});
			res.end(content);
		});
	}
})
.get('/js/dixit.js', function(req, res){
  fs.readFile('./js/dixit.js', function(error, content) {
      res.writeHead(200, {"Content-Type": "text/javascript"});
      res.end(content);
    });
})
.get('/css/dixit.css', function(req, res){
  fs.readFile('./css/dixit.css', function(error, content) {
      res.writeHead(200, {"Content-Type": "text/css"});
      res.end(content);
    });
});



a_defausser = [];
io.sockets.on('connection', function (socket, pseudo) {

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session
    socket.on('pseudo', function(pseudo) {
        let pseudo_ok = check_pseudo(pseudo);
        if(pseudo_ok) {
        	socket.pseudo = pseudo;
          console.log(pseudo + " vient de se connecter.");
          
          if(players.length == 0){
            chef = pseudo;
          }
          socket.emit('new_leader', chef);
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
      if(socket.pseudo !== undefined) {
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
      }
    	
    });

    socket.on('start_game', function() {
      socket.emit('change_view', "C");
      socket.broadcast.emit('change_view', "C");
      index_counter = 0;
      counter=chef;
      socket.emit('counter', counter);
      socket.broadcast.emit('counter', counter);
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
    	card = cleanCardName(card);
      chosen_cards[counter] = card;
      a_defausser.push(card);
      
      socket.emit('reveal_counter_choice', card, key_phrase);
      socket.broadcast.emit('reveal_counter_choice', card, key_phrase);
    });

    socket.on('guesser_card_to_play', function(card) {
    	card = cleanCardName(card);
      chosen_cards[socket.pseudo]=card;
      console.log(socket.pseudo +" a chosi la carte "+card);
      console.log(chosen_cards);
      a_defausser.push(card);
      if(Object.keys(chosen_cards).length==players.length){
        socket.emit('change_view', "D");
        socket.broadcast.emit('change_view', "D");
        a_defausser = shuffle(a_defausser); // On mélange les cartes pour brouiller les pistes
        socket.emit('start_guessing', players.length, a_defausser);
        socket.broadcast.emit('start_guessing', players.length, a_defausser);
      } else {
        socket.emit('card_received');
      }

    })

    socket.on('guesser_choice', function(pseudo, card) {
    	card = cleanCardName(card);
      guesses[pseudo]=card;

      console.log(pseudo +" a choisi la carte  " + card);
      
      if(Object.keys(guesses).length == players.length-1){
        socket.emit('show_votes', players, counter, chosen_cards, guesses);
        socket.broadcast.emit('show_votes', players, counter, chosen_cards, guesses);
      }
    })

    socket.on('reveal_total_scores', function() {
        scores = computeScores();
        socket.emit('change_view', "E");
        socket.broadcast.emit('change_view', "E");
        socket.emit('scores', scores);
        socket.broadcast.emit('scores', scores);
    });

    socket.on('get_round_votes', function(){
    	socket.emit('show_round_votes', computeScoresOneGame());
    });


});



// Ecoute sur le port 50000
server.listen(50000);


function check_pseudo(pseudo) {
  if(pseudo=="" || pseudo === undefined) {
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
  counter=players[index_counter];
}

function computeScores(){
  scores = gestionScores.computeTotalScores(players, guesses, chosen_cards, counter, scores);
  return scores;
}

function computeScoresOneGame(){
  return gestionScores.computeScoresOneGame(players, guesses, chosen_cards, counter);
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function cleanCardName(cardName){ // Garder seulement le chemin relatif vers l'image de la carte
	let re = new RegExp(".*(?="+gestionCartes.dossierCartes+")");
	return cardName.replace(re, '');
}