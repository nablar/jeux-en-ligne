const http = require('http');

const server = http.createServer(function(req, res) {
  res.writeHead(200);
  res.end('Salut tout le monde ! Bienvenue sur ce site de Dixit en ligne !');
});
server.listen(50000);