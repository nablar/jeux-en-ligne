/** Renvoie le nouveau tableau de scores à partir de l'ancien, des votes et des cartes jouées. **/
function computeScoresOneGame(players, guesses, cards, teller){
	// 1) Si tous les joueurs retrouvent l’image du conteur, ou si aucun ne la retrouve, ce
	// dernier ne marque pas de point, les autres joueurs en marquent 2
	// 2) Dans les autres cas, le conteur marque 3 points ainsi que les joueurs ayant retrouvé son image.
	// 3) Chaque joueur hormis le conteur marque 1 point supplémentaire, pour chaque vote recueilli sur son image
	let scores = initScores(players); 
	let teller_card = cards[teller];
	let nb_teller_card_found = 0;
	let who_found_teller_card = [];
	for (let pseudo in guesses) {
		if(guesses[pseudo] === teller_card){
			nb_teller_card_found += 1;
			who_found_teller_card.push(pseudo);
		}
		else{ // Règle 3)
			playerOfChosenCard = whoPlayed(guesses[pseudo], cards);
			if(pseudo != playerOfChosenCard){ // On ne vote pas pour sa propre carte, Give points only if player is still connected
				scores[playerOfChosenCard] += 1;
			}
		}
	}
	if(nb_teller_card_found === players.length - 1 || nb_teller_card_found === 0) { // Règle 1)
		for (let player in players){
			if(players[player] != teller){
				scores[players[player]] += 2;
			}
		}
	}
	else{ // Règle 2)
		scores[teller] += 3;
		for (let player in who_found_teller_card) {
			scores[who_found_teller_card[player]] += 3;
		}
	}
	for(let player in scores) {
		if(!players.includes(player)){ // Remove disconnected players from scores
			delete scores[player];
		}
	}
	return scores;
}

function computeTotalScores(players, guesses, cards, teller, scores){
	let total_scores = scores || initScores(players); // argument optionnel
	let game_scores = computeScoresOneGame(players, guesses, cards, teller);
	console.log("game_scores ",game_scores);
	console.log("total_scores ",total_scores);
	for(let player in game_scores) {
		total_scores[player] += game_scores[player];
	}
	return total_scores;
}

function initScores(players){
	let scores = {}
	for(let i = 0 ; i < players.length ; i++){
		scores[players[i]] = 0;
	}
	return scores;
}

function whoPlayed(card, cards){
	for(let pseudo in cards){
		if(cards[pseudo] === card){
			return pseudo;
		}
	}
}

// this is needed to sort values as integers
function sortNumber(a,b) {
   return a - b;
}

exports.computeScoresOneGame = computeScoresOneGame;
exports.computeTotalScores = computeTotalScores;
exports.initScores = initScores;