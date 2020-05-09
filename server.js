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
// Ecoute sur le port 50000
server.listen(50000);