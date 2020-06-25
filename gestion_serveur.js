const gestionCartes = require('./gestion_cartes');
const gestionScores = require('./gestion_scores');

let players = [];
let leader; 
let teller;
let tellers_this_turn = [];
let index_teller = 0;
let chosen_cards={};
let guesses={};
let scores;
let last_game_scores;
let total_rounds = 3;
let global_rounds_done = 0;
let a_defausser = [];
let timer_seconds = 120;
let timer_seconds_teller = 180;
let timer_seconds_vote = 120;
let current_view = "B"; // values : B, C1, C2, D1, D2 and E
let disconnected_players = {};
let last_key_phrase = "";
let players_done_list=[];  // list of players who played and are not waited

function get_winners(ordered_scores) {
  winners=[ordered_scores[0][0]];
  let i=1;
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

function get_ordered_scores_rank(ordered_scores) {
  ranks=[];
  let j=0;
  let rank=1;
  while(j<ordered_scores.length) {
    let score = ordered_scores[j][1];
    ranks.push([rank, ordered_scores[j][0], score]);
    j++;

    while(j<ordered_scores.length && ordered_scores[j][1] == score) {
      ranks.push([rank, ordered_scores[j][0], score]);
      j++;
    }
    rank = ranks.length + 1;
  }
  
  return ranks;
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
  do {
    index_teller = (index_teller + 1) % players.length;
    teller = players[index_teller];
  }
  while(!(tellers_this_turn.includes(teller)) && tellers_this_turn.length > 0);
  tellers_this_turn.splice(tellers_this_turn.indexOf(teller), 1);
}

function computeScores(){
  scores = gestionScores.computeTotalScores(players, guesses, chosen_cards, teller, scores);
  return scores;
}

function computeScoresOneGame(){
	last_game_scores = gestionScores.computeScoresOneGame(players, guesses, chosen_cards, teller);
  return last_game_scores;
}

function reset(){	
	gestionCartes.chargerCartes();
	a_defausser = [];
  tellers_this_turn = [];
	scores = null;
  disconnected_players = {};
  last_game_scores = null;
	players = [];
	leader = ""; 
  teller = "";
  index_teller = 0;
  chosen_cards = {};
  guesses={};
  total_rounds = 3;
  global_rounds_done = 0;
  current_view = "B";
}

function defausser_cartes(){
	gestionCartes.defausserCartes(a_defausser);
}

/* Functions using socket */
function next_turn(socket){
  console.log("New turn. Teller : ", teller, " tellers_this_turn : ", tellers_this_turn);
  // Re initialize card choices
  guesses = {};
  chosen_cards = {};

  // Change defausse
  gestionCartes.defausserCartes(a_defausser);
  a_defausser = [];


  socket.emit("phrase_next_turn", "Conteur suivant !")
  if(tellers_this_turn.length == 1) {
    if (global_rounds_done == total_rounds - 2) {
      socket.emit("phrase_next_turn", "Dernier tour !");
    }  
    else if(global_rounds_done == total_rounds - 1){
      socket.emit("phrase_next_turn", "Voir les gagnants !")
    }
    else {
      socket.emit("phrase_next_turn", "Tour suivant !")
    }
  }
  if(tellers_this_turn.length == 0) {
    tellers_this_turn = Array.from(players);
    global_rounds_done += 1;
  }

  // Broadcast round number
  socket.emit("current_round_number", global_rounds_done + 1);
  socket.broadcast.emit("current_round_number", global_rounds_done + 1);

  // Check if game is finished
  if(global_rounds_done == total_rounds) {
    current_view = "E";
    // Change view
    socket.emit('change_view', "E", players);
    socket.broadcast.emit('change_view', "E", players);

    // Emit the final scores
    let ordered_scores = get_ordered_scores();
    let ordered_scores_rank = get_ordered_scores_rank(ordered_scores);
    let winners = get_winners(ordered_scores);
    socket.emit('final_scores', winners, ordered_scores_rank);
    socket.broadcast.emit('final_scores', winners, ordered_scores_rank);

  } else {
    current_view =="C1";
    // Change teller
    next_teller();
    socket.emit('new_teller', teller);
    socket.broadcast.emit('new_teller', teller);

    // Re initialize variables
    initialize_waiting_list(socket);

    // Change view
    socket.emit('change_view', "C", players);
    socket.broadcast.emit('change_view', "C", players);

    // Start timer
    countdown(socket, timer_seconds_teller);
  } 
  for(let pseudo in disconnected_players){
  	if(disconnected_players[pseudo]['last_game_score']){
  		delete disconnected_players[pseudo]['last_game_score'];
  	}
	}    
}


function get_round_votes(socket){
  // Compute scores of the rounds
  let round_scores = computeScoresOneGame();
  // Compute scores
  scores = computeScores();
  // Get ordered scores
  let ordered_scores = get_ordered_scores();
  // Get ordered scores with ranks
  let ordered_scores_rank = get_ordered_scores_rank(ordered_scores);
  socket.emit('show_round_votes', ordered_scores_rank, round_scores);
  socket.broadcast.emit('show_round_votes', ordered_scores_rank, round_scores);
}


function guesser_choice(socket, card){
  if(!socket.pseudo){ return; }
	card = cleanCardName(card);
  guesses[socket.pseudo]=card;

  console.log(socket.pseudo +" a choisi la carte  " + card);
  
  if(Object.keys(guesses).length == players.length-1){  // if everybody voted
    everybody_voted(socket);
  } else {
    // update waiting list
    update_waiting_list(socket);
  }
}
function everybody_voted(socket) {
  current_view = "D2";
  stopCountdown();
  socket.emit('show_votes', players, teller, chosen_cards, guesses);
  socket.broadcast.emit('show_votes', players, teller, chosen_cards, guesses);
  for(let pseudo in disconnected_players){
  	if(disconnected_players[pseudo]['guess']){
  		delete disconnected_players[pseudo]['guess'];
  	}
	}    
}

function initialize_waiting_list(socket) {
  players_done_list = [teller];
  let players_waiting_list = get_waiting_list();
  socket.emit('players_waiting_list', players_waiting_list, current_view);
  socket.broadcast.emit('players_waiting_list', players_waiting_list, current_view);
}


function update_waiting_list(socket) {
  players_done_list.push(socket.pseudo);
  let players_waiting_list = get_waiting_list();
  socket.emit('players_waiting_list', players_waiting_list, current_view);
  socket.broadcast.emit('players_waiting_list', players_waiting_list, current_view);
}


function get_waiting_list() {
  let waiting_list=[];
  for(let i=0; i<players.length; i++) {
    pseudo = players[i];
    if(!players_done_list.includes(pseudo)) {
      waiting_list.push(pseudo);
    }
  }  
  return waiting_list;
}

function guesser_card_to_play(socket, card) {
  if(!socket.pseudo || !socket.main) { return; }
	card = cleanCardName(card);
  chosen_cards[socket.pseudo]=card;
  console.log(socket.pseudo +" a choisi la carte "+card);
  socket.main.splice(socket.main.indexOf(card), 1);
  a_defausser.push(card);
  if(Object.keys(chosen_cards).length==players.length){  // if everybody chose a card
    all_guesser_chose_card_to_play(socket);
  } else {
    socket.emit('card_received');

    // update waiting list
    update_waiting_list(socket);
  }
}


function all_guesser_chose_card_to_play(socket) {
  current_view = "D1";
  stopCountdown();
  socket.emit('change_view', "D", players);
  socket.broadcast.emit('change_view', "D", players);
  a_defausser = shuffle(a_defausser); // On mélange les cartes pour brouiller les pistes

  // Initialize list of players who are waited to vote
  initialize_waiting_list(socket)

  socket.emit('start_guessing', players.length, a_defausser);
  socket.broadcast.emit('start_guessing', players.length, a_defausser);
  for(let pseudo in disconnected_players){
  	if(disconnected_players[pseudo]['chosen_card']){
  		delete disconnected_players[pseudo]['chosen_card'];
  	}
	}    
  // Start timer
  countdown(socket, timer_seconds_vote);
}

function teller_choice(socket, card, key_phrase){
  if(!socket.pseudo){ return; }
  current_view = "C2";
	card = cleanCardName(card);
  chosen_cards[teller] = card;
  a_defausser.push(card);
  last_key_phrase = key_phrase;
  socket.main.splice(socket.main.indexOf(card), 1);
  socket.emit('reveal_teller_choice', card, key_phrase);
  socket.broadcast.emit('reveal_teller_choice', card, key_phrase);

  // Initialize list of players who are waited to choose their card
  initialize_waiting_list(socket);


  // Restart timer
  countdown(socket, timer_seconds);
}

function total_round_number(socket, number){
  console.log("Le nombre total de rounds prévu est " + number);
  total_rounds = number;
  socket.emit('send_total_round_number', number);
  socket.broadcast.emit('send_total_round_number', number);
}

function timer_time_choice(socket, time, type){
  console.log(type)
  if(type == "teller"){
    console.log("Le temps pour le conteur est " + time);
    timer_seconds_teller = time;
  } else if(type == "guesser") {    
    console.log("Le temps pour les autres joueurs est " + time);
    timer_seconds = time;
  } else if(type == "vote"){
    console.log("Le temps pour le vote est " + time);
    timer_seconds_vote = time;
  }
  socket.emit('send_timer_time', time, type);
  socket.broadcast.emit('send_timer_time', time, type);
}

function tirage(socket){
  if(!socket.pseudo){ return; }
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

    if(!(pseudo in disconnected_players)){
    	socket.emit('change_view', "B", players);
    }
    socket.emit('players_list', players);
    // Send new player name to other players
    socket.broadcast.emit('players_list', players);

    // Send number of rounds
    socket.emit('send_total_round_number', total_rounds);
    socket.emit('send_timer_time', timer_seconds_teller, "teller")
    socket.emit('send_timer_time', timer_seconds, "guesser")
    socket.emit('send_timer_time', timer_seconds_vote, "vote")
    if(pseudo in disconnected_players){
    	socket.main = disconnected_players[pseudo]['jeu'];
	    scores[pseudo] = 0;
    	if(disconnected_players[pseudo]['score'] !== undefined){
    		scores[pseudo] = disconnected_players[pseudo]['score'];	
    	}
    	if(disconnected_players[pseudo]['last_game_score'] !== undefined){
    		last_game_scores[pseudo] = disconnected_players[pseudo]['last_game_score'];	
    	}
    	else{
    		last_game_scores[pseudo] = 0;	
    	}
    	if(disconnected_players[pseudo]['guess'] !== undefined){
    		guesses[pseudo] = disconnected_players[pseudo]['guess'];
    	}
    	if(disconnected_players[pseudo]['chosen_card'] !== undefined){
    		chosen_cards[pseudo] = disconnected_players[pseudo]['chosen_card'];	
    	}
    	if(current_view == "C2" && Object.keys(chosen_cards).length == players.length){  // if view is second part of view C and everybody chose a card
      	all_guesser_chose_card_to_play(socket);
    	}
	    // Verify that other players aren't blocket in view D1
	    else if(current_view == "D1" && Object.keys(guesses).length == players.length-1){  // if everybody voted
	      everybody_voted(socket);
	    }
	    else {
	    	socket.emit('change_view', current_view[0], players);
  			socket.emit('new_teller', teller);
	    	if(current_view === 'C2') {
  				socket.emit('reveal_teller_choice', chosen_cards[teller], last_key_phrase);
	    	}
	    	else if(current_view === 'D1'){
  				socket.emit('reveal_teller_choice', chosen_cards[teller], last_key_phrase);
  				socket.emit('start_guessing', players.length, a_defausser);
	    	}
	    	else if(current_view === 'D2'){
				  socket.emit('show_round_votes', get_ordered_scores_rank(get_ordered_scores()), last_game_scores);
				  socket.broadcast.emit('show_round_votes', get_ordered_scores_rank(get_ordered_scores()), last_game_scores);
	    	}
    	}
    	delete disconnected_players[pseudo];
    }
    console.log('disconnected_players: ', disconnected_players);
  }
  else {
    socket.emit('message', "Ce pseudo est déjà pris, choisis-en un autre.")
  }
}

function disconnect(socket){
  if(socket.pseudo !== undefined) {
    console.log(socket.pseudo + " vient de se déconnecter.");
    socket.broadcast.emit('message', socket.pseudo + " vient de se déconnecter.");
    disconnected_players[socket.pseudo] = {};
    if(socket.main!==undefined){
    	disconnected_players[socket.pseudo]['jeu'] = socket.main;
    }

    // Update players list
    let index;
    for(var i = 0 ; i < players.length ; i++) {
      if(socket.pseudo == players[i]) {
        index=i;
      }
    }
    players.splice(index,1);
    socket.broadcast.emit('players_list', players);

    // Update scores 
    if(scores !== undefined && scores !== null && socket.pseudo in scores) {
    	disconnected_players[socket.pseudo]['score'] = scores[socket.pseudo];
      console.log("pseudo removed from scores");
      delete scores[socket.pseudo];
    }

    if(last_game_scores !== undefined && socket.pseudo in last_game_scores) {
    	disconnected_players[socket.pseudo]['last_game_score'] = last_game_scores[socket.pseudo];
      console.log("pseudo removed from last game scores");
      delete last_game_scores[socket.pseudo];
    }

    // Update chosen_cards if card is still not displayed on the board game of all players, and if it is not the card of the teller
    if(socket.pseudo != teller && socket.pseudo in chosen_cards && current_view == "C2") {
      console.log("pseudo removed from chosen cards");
      disconnected_players[socket.pseudo]['chosen_card'] = chosen_cards[socket.pseudo];
      delete chosen_cards[socket.pseudo];
    }

    // Update guesses
    if(socket.pseudo in guesses) {
    	disconnected_players[socket.pseudo]['guess'] = guesses[socket.pseudo];
      console.log("pseudo removed from guesses");
      delete guesses[socket.pseudo];
    }
    

    // Use new players list
    if(players.length == 0) {
      console.log("Tous les joueurs sont partis. Re-initialisation.")
      next_game(socket);
    } 
    if(socket.pseudo == leader && players.length != 0) {
      leader = players[0];
      socket.broadcast.emit('new_leader', leader);
      console.log("le nouveau leader est " + leader);
    }

    // Verify that other players aren't blocket in view C2
    if(current_view == "C2" && Object.keys(chosen_cards).length==players.length){  // if view is second part of view C and everybody chose a card
      all_guesser_chose_card_to_play(socket);
    }
    // Verify that other players aren't blocket in view D1
    if(current_view == "D1" && Object.keys(guesses).length == players.length-1){  // if everybody voted
      everybody_voted(socket);
    }
    console.log('disconnected_players: ', disconnected_players);
  }
}

function start_game(socket) {
  scores = gestionScores.initScores(players);
  current_view = "C1";
  socket.emit('change_view', "C", players);
  socket.broadcast.emit('change_view', "C", players);
  tellers_this_turn = Array.from(players);
  index_teller = -1;
  next_teller();
  socket.emit('new_teller', teller);
  socket.broadcast.emit('new_teller', teller);	
  // Start timer
  countdown(socket, timer_seconds_teller);
}

function next_game(socket) {
  socket.emit('redirect', "/reset");
  socket.broadcast.emit('redirect', "/reset");
}

function show_sidenav_tellers(socket) {
  socket.emit('send_sidenav_tellers', players, teller);
}

function show_sidenav_scores(socket) {
  let ordered_scores = get_ordered_scores();
  let ordered_scores_rank = get_ordered_scores_rank(ordered_scores);
  socket.emit('send_sidenav_scores', ordered_scores_rank);
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
exports.get_ordered_scores_rank = get_ordered_scores_rank;

/* Functions using socket */
exports.next_turn = next_turn;
exports.get_round_votes = get_round_votes;
//exports.reveal_total_scores = reveal_total_scores;
exports.guesser_choice = guesser_choice;
exports.guesser_card_to_play = guesser_card_to_play;
exports.teller_choice = teller_choice;
exports.total_round_number = total_round_number;
exports.timer_time_choice = timer_time_choice;
exports.tirage = tirage;
exports.pseudo = pseudo;
exports.disconnect = disconnect;
exports.start_game = start_game;
exports.countdown = countdown;
exports.next_game = next_game;
exports.show_sidenav_tellers = show_sidenav_tellers;
exports.show_sidenav_scores = show_sidenav_scores;

/* Variables  exports*/
exports.players = players;
exports.leader = leader; 
exports.teller = teller;
exports.index_teller = index_teller;
exports.chosen_cards = chosen_cards;
exports.guesses = guesses;
exports.scores = scores;
exports.total_rounds = total_rounds;
exports.done_rounds = global_rounds_done;
exports.a_defausser = [];