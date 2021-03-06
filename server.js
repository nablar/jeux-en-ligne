const http = require('http');
const fs = require('fs');
const express = require('express');
const gestionServeur = require('./gestion_serveur');
const path = require('path');
const favicon = require('express-favicon');

const app = require('express')();
const server = require('http').Server(app);
// Chargement de socket.io
const io = require('socket.io')(server);

app.use(express.static('cartes'));
app.use(favicon(path.join(__dirname, 'favicon.png'))); 
// Chargement du fichier pseudo.html affiché au client
app.get('/', function(req, res) {
    fs.readFile('views/dixit.html', function(error, content) {
    	if(error) throw error;
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
})
.get('/cartes/:nom', function(req, res){
	if(req.params.nom.match(/^[0-9]+\.jpg$/g)){
		fs.readFile('cartes/'+req.params.nom, function(error, content) {
			res.writeHead(200, {"Content-Type": "image/jpeg"});
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
})
.get('/reset', function(req, res){
	gestionServeur.reset();
	res.writeHead(302, {'Location': '/'});
	res.end("Done resetting");
})
.get('/sounds/:soundfile', function(req, res){    
    if(req.params.soundfile.match(/^\w+\.ogg$/g)){
        fs.readFile('sounds/'+req.params.soundfile, function(error, content) {
            res.writeHead(200, {"Content-Type": "audio/ogg"});
            res.end(content);
        });
    }
})
.get('/fonts/:fontfile', function(req, res){    
    if(req.params.fontfile.match(/^\w+\.(o|t)tf$/g)){
        fs.readFile('fonts/'+req.params.fontfile, function(error, content) {
            res.writeHead(200, {"Content-Type": "application/octet-stream"});
            res.end(content);
        });
    }
});


io.sockets.on('connection', function (socket, pseudo) {

    socket.on('log-message', function(message) {
      console.log(message)
    });

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session
    socket.on('pseudo', function(pseudo) {
    	gestionServeur.pseudo(socket, pseudo);
    });

    socket.on('disconnect', function(){
    	gestionServeur.disconnect(socket);    	
    });

    socket.on('start_game', function() {
    	gestionServeur.start_game(socket);
    });

    socket.on('total_round_number', function(number) {
    	gestionServeur.total_round_number(socket, number);
    });

    socket.on('timer_time_choice', function(time, type) {
    	gestionServeur.timer_time_choice(socket, time, type);
    });

    socket.on('tirage', function(){
    	gestionServeur.tirage(socket);
    });

    socket.on('defausser', function(){
    	gestionServeur.defausser_cartes();
    });

    socket.on('teller_choice', function(card, key_phrase) {
    	gestionServeur.teller_choice(socket, card, key_phrase);
    });

    socket.on('guesser_card_to_play', function(card) {
    	gestionServeur.guesser_card_to_play(socket, card);
    });

    socket.on('guesser_choice', function(card) {
    	gestionServeur.guesser_choice(socket, card);
    });

    socket.on('reveal_total_scores', function() {
    	gestionServeur.reveal_total_scores(socket);
    });

    socket.on('get_round_votes', function(){
    	gestionServeur.get_round_votes(socket);
    });

    socket.on('next_turn', function() {
    	gestionServeur.next_turn(socket);
    });

    socket.on('next_game', function() {
      gestionServeur.next_game(socket);
    });

    socket.on('show_sidenav_tellers', function() {
      gestionServeur.show_sidenav_tellers(socket);
    });

    socket.on('show_sidenav_scores', function() {
      gestionServeur.show_sidenav_scores(socket);
    });

});


let port = process.env.PORT; // Nécessaire pour heroku : on ne choisit pas le port
if (port == null || port == "") {
	// Ecoute sur le port 50000 en tests locaux
  port = 50000;
}
server.listen(port); 