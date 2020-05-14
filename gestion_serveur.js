const gestionCartes = require('./gestion_cartes');
const gestionScores = require('./gestion_scores');

let players = [];
let leader; 
let teller;
let index_teller = 0;
let chosen_cards={};
let guesses={};
let scores;
let total_rounds = 3;
let done_rounds = 0;
let a_defausser = [];
let timer_seconds = 120;
let timer_seconds_teller = 180;
let timer_seconds_vote = 180;

function get_winners(ordered_scores) {
  winners=[ordered_scores[0][0]];
  i=1;
  while(i<ordered_scores.length && ordered_scores[i][1] == ordered_scores[0][1]) {
    winners.push(ordered_scores[i][0]);
    i++;
  }
  console.log("Le gagnant est : " + winners);
  return winners;
}

function get_ordered_scores() {
  let ordered_scores = Object.keys(scores).map(function(key) {
    return [key, scores[key]];
  });

  ordered_scores.sort(function(first, second) {
    return second[1] - first[1];
  });
  return ordered_scores;
}

function cleanCardName(cardName){ // Garder seulement le chemin relatif vers l'image de la carte
	let re = new RegExp(".*(?="+gestionCartes.dossierCartes+")");
	return cardName.replace(re, '');
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

function next_teller() {
  index_teller = (index_teller + 1) % players.length;
  teller=players[index_teller];
}

function computeScores(){
  scores = gestionScores.computeTotalScores(players, guesses, chosen_cards, teller, scores);
  return scores;
}

function computeScoresOneGame(){
  return gestionScores.computeScoresOneGame(players, guesses, chosen_cards, teller);
}

function reset(){	
	gestionCartes.defausserCartes(a_defausser);
	a_defausser = [];
	scores = null;
	players = [];
	leader = ""; 
  teller = "";
  index_teller = 0;
  chosen_cards={};
  guesses={};
  total_rounds = 3;
	done_rounds = 0;
}

function defausser_cartes(){
	gestionCartes.defausserCartes(a_defausser);
}

/* Functions using socket */
function next_turn(socket){
  // Re initialize card choices
  guesses = {};
  chosen_cards = {};

  // Change defausse
  gestionCartes.defausserCartes(a_defausser);
  a_defausser = [];

  // Change teller
  next_teller();
  socket.emit('new_teller', teller);
  socket.broadcast.emit('new_teller', teller);

  // Change view
  socket.emit('change_view', "C", players);
  socket.broadcast.emit('change_view', "C", players);

  // Start timer
  countdown(socket, timer_seconds_teller);
}

function get_round_votes(socket){
  socket.emit('show_round_votes', computeScoresOneGame());
}

function reveal_total_scores(socket){
  // Compute scores
  scores = computeScores();

  // Check if game is finished
  done_rounds+=1;
  if(done_rounds == total_rounds * players.length) {
    // Change view
    socket.emit('change_view', "F", players);
    socket.broadcast.emit('change_view', "F", players);

    // Emit the final scores
    let ordered_scores = get_ordered_scores();
    let winners = get_winners(ordered_scores);
    socket.emit('final_scores', winners, ordered_scores);
    socket.broadcast.emit('final_scores', winners, ordered_scores);

  } else {
    socket.emit('change_view', "E", players);
    socket.broadcast.emit('change_view', "E", players);
    // Emit the scores
    socket.emit('scores', scores);
    socket.broadcast.emit('scores', scores);
  }	
}

function guesser_choice(socket, pseudo, card){
	card = cleanCardName(card);
  guesses[pseudo]=card;

  console.log(pseudo +" a choisi la carte  " + card);
  
  if(Object.keys(guesses).length == players.length-1){  // if everybody voted
    stopCountdown();
    socket.emit('show_votes', players, teller, chosen_cards, guesses);
    socket.broadcast.emit('show_votes', players, teller, chosen_cards, guesses);
  }
}

function guesser_card_to_play(socket, card){
	card = cleanCardName(card);
  chosen_cards[socket.pseudo]=card;
  console.log(socket.pseudo +" a chosi la carte "+card);
  socket.main.splice(socket.main.indexOf(card), 1);
  a_defausser.push(card);
  if(Object.keys(chosen_cards).length==players.length){  // if everybody chose a card
    stopCountdown();
    socket.emit('change_view', "D", players);
    socket.broadcast.emit('change_view', "D", players);
    a_defausser = shuffle(a_defausser); // On mélange les cartes pour brouiller les pistes
    socket.emit('start_guessing', players.length, a_defausser);
    socket.broadcast.emit('start_guessing', players.length, a_defausser);
    
    // Start timer
    countdown(socket, timer_seconds_vote);
  } else {
    socket.emit('card_received');
  }
}

function teller_choice(socket, card, key_phrase){
	card = cleanCardName(card);
  chosen_cards[teller] = card;
  a_defausser.push(card);
  socket.main.splice(socket.main.indexOf(card), 1);
  socket.emit('reveal_teller_choice', card, key_phrase);
  socket.broadcast.emit('reveal_teller_choice', card, key_phrase);

  // Restart timer
  countdown(socket, timer_seconds);
}

function total_round_number(socket, number){
  console.log("Le nombre total de rounds prévu est " + number);
  total_rounds = number;
  socket.emit('send_total_round_number', number);
  socket.broadcast.emit('send_total_round_number', number);
}

function tirage(socket){
	if(!socket.main){
		socket.main = [];
	}
	socket.main = socket.main.concat(gestionCartes.tirerCartes(6 - socket.main.length));
	socket.emit('tirage', socket.main);
}

let timer;
let seconds_remaining;
function countdown(socket, start){
  stopCountdown();
  seconds_remaining = start;
  timer = setInterval(() => {
    socket.emit('timer', seconds_remaining);
    socket.broadcast.emit('timer', seconds_remaining);
    seconds_remaining--;
    if(seconds_remaining == -1){
      socket.emit('timeout');
      socket.broadcast.emit('timeout');
      stopCountdown();
    }
  }, 1000);
}

function stopCountdown(){
  clearInterval(timer);
}

function pseudo(socket, pseudo){
  let pseudo_ok = check_pseudo(pseudo);
  if(pseudo_ok) {
  	socket.pseudo = pseudo;
    console.log(pseudo + " vient de se connecter.");
    
    if(players.length == 0){
      leader = pseudo;
    }
    socket.emit('new_leader', leader);
    players.push(pseudo);

    socket.emit('change_view', "B", players);
    socket.emit('players_list', players);
    // Send new player name to other players
    socket.broadcast.emit('players_list', players);

    // Send number of rounds
    socket.emit('send_total_round_number', total_rounds);
  }
  else {
    socket.emit('message', "Ce pseudo est déjà pris, choisis-en un autre.")
  }
}

function disconnect(socket){
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

    if(players.length == 0) {
      console.log("Tous les joueurs sont partis. Re-initialisation.")
      next_game(socket);
    } 
    if(socket.pseudo == leader && players.length != 0) {
      leader = players[0];
      socket.broadcast.emit('new_leader', leader);
      console.log("le nouveau leader est " + leader);
    }
  }
}

function start_game(socket) {
  socket.emit('change_view', "C", players);
  socket.broadcast.emit('change_view', "C", players);
  index_teller = 0;
  teller = leader;
  socket.emit('new_teller', teller);
  socket.broadcast.emit('new_teller', teller);	
  // Start timer
  countdown(socket, timer_seconds_teller);
}

function next_game(socket) {
  socket.emit('redirect', "/reset");
  socket.broadcast.emit('redirect', "/reset");
}

/* Functions exports */
exports.get_winners = get_winners;
exports.get_ordered_scores = get_ordered_scores;
exports.cleanCardName = cleanCardName;
exports.shuffle = shuffle;
exports.check_pseudo = check_pseudo;
exports.next_teller = next_teller;
exports.computeScores = computeScores;
exports.computeScoresOneGame = computeScoresOneGame;
exports.reset = reset;
exports.defausser_cartes = defausser_cartes;
exports.stopCountdown = stopCountdown;

/* Functions using socket */
exports.next_turn = next_turn;
exports.get_round_votes = get_round_votes;
exports.reveal_total_scores = reveal_total_scores;
exports.guesser_choice = guesser_choice;
exports.guesser_card_to_play = guesser_card_to_play;
exports.teller_choice = teller_choice;
exports.total_round_number = total_round_number;
exports.tirage = tirage;
exports.pseudo = pseudo;
exports.disconnect = disconnect;
exports.start_game = start_game;
exports.countdown = countdown;
exports.next_game = next_game;

/* Variables  exports*/
exports.players = players;
exports.leader = leader; 
exports.teller = teller;
exports.index_teller = index_teller;
exports.chosen_cards = chosen_cards;
exports.guesses = guesses;
exports.scores = scores;
exports.total_rounds = total_rounds;
exports.done_rounds = done_rounds;
exports.a_defausser = [];