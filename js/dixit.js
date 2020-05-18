window.onbeforeunload = function() {
    return "Il est déconseillé d'actualiser cette page, vous allez sortir de la partie !";
}


/***************************** GLOBAL PARAMETERS *****************************/
let socket = io.connect(document.location.href);
let pseudo;  // stores the pseudo of the player
let teller = false;  // true if the player is the current teller
let leader = false;  // true if the player is the leader
let chosen_card_to_play;  // contains the card chosen to display on the board game
let total_round_number = 3;  // contains the number of rounds chosen by the leader on view B
let current_round_number = 0;  // contains the number of the current round
let cards_can_be_selected = true;  // according to the moment in the game, cards can or cannot be selected
let current_view;  // contains the letter corresponding to the current view
let teller_chose = false;  // true if the teller already sent its card and phrase
const notification_soud = new Audio('sounds/son_notification.ogg');




/***************************** VUE A *****************************/
// Send the pseudo of the player to the server
function sendPseudo() {
    pseudo = document.getElementById("pseudo-input").value;
    socket.emit('pseudo', pseudo);
    document.getElementById("pseudo").innerHTML = "Bienvenue " + pseudo + " !";
}




/***************************** VUE B *****************************/
// Receive list of players' pseudo
socket.on('players_list', function(list) {
    let ul = document.getElementById("online-players");
    
    while (ul.hasChildNodes()) {  
        ul.removeChild(ul.firstChild);
    }

    for (let i=0; i<list.length ; i++) {
        let li = document.createElement("li");
        li.appendChild(document.createTextNode(list[i]));
        if(i==0){ // icône de chef
            let span = document.createElement("span");
            span.innerHTML = "👑";
            li.appendChild(span);
        }
        ul.appendChild(li);
    }
});

// Receive leader's name. Could also be received in another view than view B if the previous leader was disconnected
socket.on('new_leader', function(pseudo_leader) {
    if(pseudo_leader==pseudo) {
        leader=true;
        socket.emit('log-message', "Je suis le nouveau leader : " + pseudo);
        change_style_of_class("hide-if-leader", "display:none"); 
        change_style_of_class("hide-if-not-leader", ""); 
    } else {
        leader=false;
        change_style_of_class("hide-if-not-leader", "display:none");
        change_style_of_class("hide-if-leader", ""); 
    }
});

// For the leader to send the total round number
function sendRoundNumber() {
    let round_number = document.getElementById("round-number-input").value;
    if(round_number<=0) {
        display_message_snackbar("Tu dois choisir un nombre strictement positif !");
    } else {
        socket.emit("total_round_number", round_number);
    }
}

// For players to receive the total round number decided by the leader
socket.on('send_total_round_number', function(number) {
    total_round_number = number;
    let round_number = document.getElementById("round-number");
    if(number==1) {
        round_number.innerHTML = number + " tour";
    } else {
        round_number.innerHTML = number + " tours";
    }
});




/***************************** VUE C *****************************/
socket.on('tirage', function(cartes){
    for (var i = 0; i < cartes.length; i++) {
        document.getElementById("carte"+i).src = cartes[i];
    }
});

socket.on('new_teller', function(pseudo_teller) {
    document.getElementById("top-right-teller").innerHTML = "Conteur : " + pseudo_teller;
    teller_chose = false;
    // Re initialize
    document.getElementById("title-after-vote").innerHTML ="";
    if(leader) {
        change_style_of_class("show-after-vote-for-leader", "display:none");
    }

    let c = document.getElementById("teller");
    if(pseudo==pseudo_teller) {
        teller=true;
        c.innerHTML = "Tu es le conteur, choisis une carte et ta phrase.";
        change_style_of_class("hide-if-teller", "display:none"); 
        change_style_of_class("hide-if-not-teller", ""); 
        notification_soud.play();
    } else {
        change_style_of_class("hide-if-not-teller", "display:none"); 
        change_style_of_class("hide-if-teller", ""); 
        // hide before the teller chooses its card
        change_style_of_class("hide-before-teller-choice", "display:none");  
        teller=false;
        c.innerHTML = "Attends que <span class=\"teller-pseudo\">" + pseudo_teller + "</span> ait choisi sa carte.";

        if (document.getElementsByClassName("teller-pseudo").length > 0) {
            for (let i=0; i<document.getElementsByClassName("teller-pseudo").length ; i++) {
                document.getElementsByClassName("teller-pseudo")[i].innerHTML = pseudo_teller;
            }
        }
        
    }
});

function sendKeyPhrase(){
    if(document.getElementsByClassName("carte-choisie").length==0){
        display_message_snackbar("N'oublie pas de sélectionner une carte d'abord !");
    } else {
        let carte = document.getElementsByClassName("carte-choisie")[0];
        let src = carte.src;
        key_phrase = document.getElementById("phrase-clef-input-text").value;
        socket.emit('teller_choice', src, key_phrase);
        cards_can_be_selected = false; // Block card selection
    }
}

socket.on('reveal_teller_choice', function(card, key_phrase) {
    for(let i=0; i<document.getElementsByClassName("phrase-clef").length; i++) {
        document.getElementsByClassName("phrase-clef")[i].innerHTML = key_phrase;
    }
    if(teller) {
        document.getElementById("phrase-clef-input").style = "display:none";
        document.getElementById("teller").innerHTML = "Les autres joueurs sont en train de choisir leurs cartes.";
    } else {
        change_style_of_class("hide-before-teller-choice", "");
        document.getElementById("teller").innerHTML = "";  
        notification_soud.play();
        window.scrollTo(0,0);
    }  
    teller_chose = true;
});

function cardToPlayChosen() {
    if(teller) {
        display_message_snackbar("Tu ne vas pas donner 2 cartes !");
    } else {
        if(document.getElementsByClassName("carte-choisie").length == 0){
            display_message_snackbar("N'oublie pas de sélectionner une carte d'abord !");
        } else {
            let carte = document.getElementsByClassName("carte-choisie")[0];
            chosen_card_to_play = carte.src;
            socket.emit('guesser_card_to_play', chosen_card_to_play);
        }
    }
}

let card_received_msg_first_part = ["Bien noté !", "Bien choisi !", "Parfait !", "Bien !", "D'accord !", "Drôle de choix !",
    "Bon choix !", "C'est noté !", "Pas sûr que ça fasse illusion !", "Très bien !", "Faisons comme ça !", "Pourquoi pas !", 
    "Espérons que ça passe !", "Les autres seront dupés !", "Ça passe ou ça casse !", "Bonne idée de se débarasser des cartes nulles !",
    "Même la carte du conteur est moins bien !", "Tout le monde va voter pour toi !"];
let card_received_msg_second_part = ["Attendons les autres joueurs...", "Attendons les retardataires..." ,
    "Ne sois pas trop fâché contre les retardataires...", "Laisse encore un peu de temps à tes camarades...",
    "Dommage que tout le monde ne soit pas aussi rapide que toi...", "Attends que les autres joueurs soient prêts...",
    "Les autres ne sont pas aussi rapides...", "Les autres trainent un peu...", "Plus qu'à attendre les autres..."];

socket.on('card_received', function() {
    let card_received_msg = random_element_in_list(card_received_msg_first_part) + " " + random_element_in_list(card_received_msg_second_part);
    document.getElementById("inst-with-keyphrase").innerHTML = card_received_msg;
    let to_hide = document.getElementById("choose-card-to-play");
    to_hide.style="display:none";
    cards_can_be_selected = false;
});

function cardSelected(id){
    if(!cards_can_be_selected) {return;}
    if(document.getElementsByClassName("carte-choisie").length>0){
        document.getElementsByClassName("carte-choisie")[0].classList.remove("carte-choisie");
    }
    document.getElementById(id).classList.add("carte-choisie");
}



/***************************** VUE D - 1st part : send votes *****************************/
socket.on('start_guessing', function(nbJoueurs, cartes){
    clearPlateau(); // supprimer les cartes du tour précédent
    populatePlateau(nbJoueurs, cartes);
});

let vote_received_msg_first_part = ["Bien noté !", "Bien choisi !", "Parfait !", "Bien !", "D'accord !", "Drôle de choix !",
    "Bon choix !", "C'est noté !", "Pas sûr que ça soit le bon choix !", "Très bien !", "Tentons-le !", "Pourquoi pas !", 
    "Espérons que ça soit le bon choix !", "Les autres seront ébahis !", "Ton vote est pris en compte !", "Vote enregistré !", 
    "Bien vu !", "Croisons les doigts !", "Ça passe ou ça casse !"];
let vote_received_msg_second_part = ["Attendons les autres joueurs...", "Attendons les retardataires..." ,
    "Ne sois pas trop fâché contre les retardataires...", "Laisse encore un peu de temps à tes camarades...",
    "Dommage que tout le monde ne soit pas aussi rapide que toi...", "Attends que les autres joueurs soient prêts...",
    "Les autres ne sont pas aussi rapides...", "Les autres traînent un peu...", "Qu'attendent les autres, le choix est simple, pourtant...",
    "Patiente jusqu'à ce que tout le monde ait voté...", "Plus qu'à attendre les autres..."];


function sendVote() {
    if(teller) {
        display_message_snackbar("Tu ne peux pas voter, petit tricheur !");
    } else {
        if(document.getElementsByClassName("carte-choisie-d").length==0){
            display_message_snackbar("N'oublie pas de sélectionner une carte d'abord !");
        } else {
            let carte = document.getElementsByClassName("carte-choisie-d")[0];
            let src = carte.src;

            if (chosen_card_to_play == src){
                display_message_snackbar("Tu ne peux pas voter pour ta propre carte, petit tricheur !");
            } else {
                socket.emit('guesser_choice', src);

                //Change title
                change_style_of_class("hide-after-vote", "display:none");
                let vote_received_msg = random_element_in_list(vote_received_msg_first_part) + " " + random_element_in_list(vote_received_msg_second_part);
                document.getElementById("title-after-vote").innerHTML = vote_received_msg;
                cards_can_be_selected = false; // Block card selection
            }                        
        }
    }    
}

function cardSelectedD(id){
    if(!cards_can_be_selected) {return;}
    if(document.getElementsByClassName("carte-choisie-d").length>0){
        document.getElementsByClassName("carte-choisie-d")[0].classList.remove("carte-choisie-d");
    }
    document.getElementById(id).classList.add("carte-choisie-d");
}

function populatePlateau(nbJoueurs, cartes){
    // 3 cartes par ligne
    nbLignes = Math.ceil(nbJoueurs/3);
    tableau = document.getElementById("plateau");
    for(let i = 0 ; i < nbLignes ; i++){
        ligne = document.createElement("tr");
        for(let j = 0 ; j < 3 ; j++){
            if(3*i+j == nbJoueurs){
                break;
            }
            let carte = document.createElement("img");
            carte.src = cartes[3*i+j];
            carte.classList.add("carte-d")
            carte.id = "carte"+i+"-"+j;
            carte.setAttribute('onClick', "cardSelectedD(this.id)");
            let td = document.createElement("td");
            td.appendChild(carte);
            ligne.appendChild(td);
        }
        tableau.appendChild(ligne);
    }
}



/***************************** VUE D - 2nd part : display votes *****************************/
socket.on('show_votes', function(players_list, teller_pseudo, chosen_cards, guesses) {
    // Change title
    change_style_of_class("hide-after-vote", "display:none");
    if(leader) {
        change_style_of_class("show-after-vote-for-leader", "")
        socket.emit('get_round_votes');
    }
    
    document.getElementById("title-after-vote").innerHTML = "Voici les résultats des votes";
    
    let card_list = document.getElementsByClassName("carte-d");
    // Show results of votes 
    showVotesResults(card_list, players_list, guesses, teller_pseudo);

    // Show who chose the cards
    showCardsOwners(card_list, chosen_cards, teller_pseudo);
});

function showVotesResults(card_list, players_list, guesses, teller_pseudo) {
    for(let i=0; i<players_list.length; i++){
        let name = players_list[i];
        if(name == teller_pseudo) { // the teller didn't vote
            continue;
        }
        let card = guesses[name];

        for(let j=0; j<card_list.length; j++) {
            if(card_list[j].src.endsWith(card)) {
                var newDiv = document.createElement("div");
                var newContent = document.createTextNode(name);
                newDiv.appendChild(newContent);
                card_list[j].parentNode.insertBefore(newDiv, card_list[j].nextSibling);
                break;
            }
        }
    }
}

function showCardsOwners(card_list, chosen_cards, teller_pseudo) {
    let players_who_send_card = Object.keys(chosen_cards);
    for(let i=0; i<players_who_send_card.length; i++){
        let name = players_who_send_card[i];
        let card = chosen_cards[name];

        for(let j=0; j<card_list.length; j++) {

            if(card_list[j].src.endsWith(card)) {
                var newDiv = document.createElement("div");
                newDiv.classList.add("show-card-owner");
                var newContent = document.createTextNode("Carte de " + name);
                newDiv.appendChild(newContent);

                card_list[j].parentNode.insertBefore(newDiv, card_list[j]);

                //Add selection halo around teller card
                if(name==teller_pseudo) {
                    card_list[j].classList.add("reveal-teller-card");
                }
                break;
            }
        }
    }
}

socket.on('show_round_votes', function(ordered_scores_rank, round_scores) {
    showRoundVotes(ordered_scores_rank, round_scores);
});

function showRoundVotes(ordered_scores_rank, round_scores) {    
    cards_can_be_selected = false; // Block card selection
    clearScoresTable();
    let title = document.getElementById("title-after-vote");
    let table = document.createElement("table");

    table.id = "scores";
    table.classList.add("scores-table");

    // header of table
    let thead = document.createElement("thead");
    let title_row = document.createElement("tr");

    let title_rank = document.createElement("th");
    title_rank.innerHTML = "Rang";
    title_row.appendChild(title_rank);
    let title_pseudo = document.createElement("th");
    title_pseudo.innerHTML = "Pseudo";
    title_row.appendChild(title_pseudo);
    let title_score = document.createElement("th");
    title_score.innerHTML = "Points";
    title_row.appendChild(title_score);

    thead.appendChild(title_row);
    table.appendChild(thead);


    // body of table
    let tbody = document.createElement("tbody");

    for(let i=0; i<ordered_scores_rank.length; i++){
        let player_row = document.createElement("tr");
        let rank = document.createElement("td");
        rank.innerHTML = ordered_scores_rank[i][0];
        let pseudo = document.createElement("td");
        pseudo.innerHTML = ordered_scores_rank[i][1];
        let score = document.createElement("td");
        score.innerHTML = ordered_scores_rank[i][2] + " (+" + round_scores[ordered_scores_rank[i][1]] + ")" ;

        player_row.appendChild(rank);
        player_row.appendChild(pseudo);
        player_row.appendChild(score);

        tbody.appendChild(player_row);
    }
    table.appendChild(tbody);
    title.parentNode.appendChild(table);
}





/***************************** VUE E *****************************/
socket.on('final_scores', function(winner, scores) {
    if(winner.length == 1) {
        document.getElementById("winner-name").innerHTML="Le gagnant est " + winner[0] + " !";
    } else {
        winners_name=winner[0];
        for(let i=1; i<winner.length-1; i++) {
            winners_name += ", " + winner[i];
        }
        winners_name += " et " + winner[winner.length-1];
        document.getElementById("winner-name").innerHTML="Les gagnants sont : " + winners_name;
    }
    
    let tbody = document.getElementById("final-scores-table-body");
    
    for(let i=0; i<scores.length; i++){
        let player_row = document.createElement("tr");
        let rank = document.createElement("td");
        rank.innerHTML = scores[i][0];
        let pseudo = document.createElement("td");
        pseudo.innerHTML = scores[i][1];
        let score = document.createElement("td");
        score.innerHTML = scores[i][2];

        player_row.appendChild(rank);
        player_row.appendChild(pseudo);
        player_row.appendChild(score);

        tbody.appendChild(player_row);
    }
});

socket.on('redirect', function(destination) {
    window.onbeforeunload = undefined;
    window.location.href = destination;
});




/***************************** OTHER FUNCTIONS *****************************/

socket.on('change_view', function(view, players_list) {
    current_view = view;
    document.getElementsByClassName("current-view")[0].classList.remove("current-view");
    document.getElementById("vue-"+view).classList.add("current-view");
    cards_can_be_selected = true; // New view : cards can be selected again
    if(view === 'C') {
        showTitle("Voici ton jeu");
        // change round number on top left
        current_round_number += 1;
        phrase_next_turn(players_list);
        document.getElementById("current-round-number").innerHTML = Math.ceil(current_round_number/(players_list.length));
        document.getElementById("total-round-number").innerHTML = total_round_number;
        change_style_of_class("reveal-after-start", "");

        socket.emit('tirage');
        resetChosenCards(); // réinitialiser les cartes choisies
        clearPlateau(); // supprimer les cartes du tour précédent
        clearScoresTable(); // supprimer les scores du tour précédent
        resetConfirmationMessage(); // Réinitialiser le message de confirmation
        resetTellerPhrase(); // Réinitialiser la phrase du conteur
    }
    else if(view === 'D') {
        showTitle("Phase de votes");
        if(teller){
            cards_can_be_selected = false; // Block card selection
        }
        else{
            notification_soud.play();            
        }
    }

    // Display timer for views C and D
    if(view === 'C' || view === 'D') {
        document.getElementById("top-middle-timer").innerHTML = "";
        document.getElementById("top-middle-timer").style = "";
    } else {
        document.getElementById("top-middle-timer").style = "display:none";
    }
});


function phrase_next_turn(players_list){    
    document.getElementById("next-turn-button").value = "Conteur suivant !";
    if(current_round_number/players_list.length == Math.ceil(current_round_number/players_list.length)){
        // Nouveau tour
        document.getElementById("next-turn-button").value = "Tour suivant !";
        if(Math.ceil((current_round_number+players_list.length)/players_list.length) == total_round_number){
            document.getElementById("next-turn-button").value = "Dernier tour !";
        }            
    }
    if(current_round_number == total_round_number * players_list.length) {
        document.getElementById("next-turn-button").value = "Voir les gagnants !";
    }
}

socket.on('timer', function(time) {
    document.getElementById("top-middle-timer").innerHTML = time;
    if(time <= 10){
        document.getElementById("top-middle-timer").style.color = 'red';
    } 
    else {
        document.getElementById("top-middle-timer").style.color = 'white';
    }
});

socket.on('timeout', function() {
    // Send first card if none selected
    let card_to_send;
    if(current_view === 'C') {
        if(teller && !teller_chose) {
            if(document.getElementsByClassName("carte-choisie").length == 0) {
                cardSelected("carte0");   
            }
            sendKeyPhrase();
        }
        if(!teller && teller_chose) {
            if(document.getElementsByClassName("carte-choisie").length == 0) {
                cardSelected("carte0");   
            }
            cardToPlayChosen();
        }
    } 
    else if(current_view === 'D' && !teller) {
        if(document.getElementsByClassName("carte-choisie-d").length == 0) {
            cardSelectedD("carte0-0");
        }
        let i = 0;
        while(document.getElementsByClassName("carte-choisie-d")[0].src == document.getElementsByClassName("carte-choisie")[0].src) {
            cardSelectedD("carte0-"+i);
            i++;            
            console.log(i);
        }
        sendVote();
    }
});



function change_style_of_class(class_name, new_style) {
    for(let i=0; i<document.getElementsByClassName(class_name).length; i++){
        document.getElementsByClassName(class_name)[i].style = new_style;
    }
}

function random_number_in_range(max) {
    return Math.floor(Math.random() * max);
}

function random_element_in_list(list) {
    return list[random_number_in_range(list.length)];
}


/***************************** SHOW MESSAGES *****************************/
// Message du serveur
socket.on('message', function(message) {
    display_message_snackbar(message);
})


function display_message_snackbar(message) {
    let x = document.getElementById("snackbar");
    x.className = "show";
    x.innerHTML = message;
    // After 3 seconds, remove the show class from DIV and remove message
    setTimeout(function(){ x.className = x.className.replace("show", ""); x.innerHTML = ""; }, 3000);
}




/***************************** RESET FUNCTIONS *****************************/
function resetChosenCards(){
    while(document.getElementsByClassName("carte-choisie").length > 0){
        document.getElementsByClassName("carte-choisie")[0].classList.remove("carte-choisie");
    }
    while(document.getElementsByClassName("carte-choisie-d").length > 0){
        document.getElementsByClassName("carte-choisie-d")[0].classList.remove("carte-choisie-d");
    }
}

function clearPlateau(){
    let plateau = document.getElementById("plateau");
    while(plateau.hasChildNodes()){
        plateau.removeChild(plateau.childNodes[0]);
    }
}

function clearScoresTable(){
    let table = document.getElementById("scores");
    if(table){
        table.parentNode.removeChild(table);
    }
}

function resetConfirmationMessage(){
    document.getElementById("inst-with-keyphrase").innerHTML = "Choisis ta carte qui se rapporte le mieux à : <span class=\"phrase-clef\"></span>.";
}

function resetTellerPhrase(){
    document.getElementById("phrase-clef-input-text").value = "";
}

function showTitle(title){
    setTimeout( function() {
        document.body.classList.remove("show-title");
        document.body.setAttribute("title-text", "");
    }, 3000); // Duration here must be the same as the animation duration in the css of body.show-title
    document.body.setAttribute("title-text", title);
    document.body.classList.add("show-title");
}

