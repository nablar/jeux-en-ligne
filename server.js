/*
const http = require('http'); // Pour créer des serveurs http
const url = require("url"); // Pour voir l'url auquel accède l'utilisateur

// Fonction executée quand une requête est reçue
const doOnConnect = function(req, res) {
  const page = url.parse(req.url).pathname;
  console.log(page);
  if(page == "/"){
  	res.writeHead(200, {"Content-Type": "text/html"});
  	res.end('<p>Salut tout le monde ! Bienvenue sur ce site de <strong>Dixit</strong> en ligne !</p>');
  }
  else{
  	res.writeHead(404);
  	res.end('');
  }
}

// Création du serveur
const server = http.createServer(doOnConnect);
*/

const gestionCartes = require('./gestion_cartes');
const http = require('http');
const fs = require('fs');

// Chargement du fichier index.html affiché au client
const doOnConnect = function(req, res) {
    fs.readFile('views/pseudo.html', 'utf-8', function(error, content) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
};
const server = http.createServer(doOnConnect);

// Chargement de socket.io
const io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket, pseudo) {
    // Quand un client se connecte, on lui envoie un message
    socket.emit('message', 'Vous êtes bien connecté !');
    // On signale aux autres clients qu'il y a un nouveau venu
    socket.broadcast.emit('message', 'Un autre client vient de se connecter ! ');

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session
    socket.on('pseudo', function(pseudo) {
        socket.pseudo = pseudo;
        console.log(pseudo+" vient de se connecter.");
    });

    socket.on('disconnect', function(){
    	console.log(socket.pseudo+" vient de se déconnecter.");
    })

});


// Ecoute sur le port 50000
server.listen(50000);