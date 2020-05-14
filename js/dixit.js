window.onbeforeunload = function() {
    return "Il est déconseillé d'actualiser cette page, vous allez sortir de la partie !";
}

let socket = io.connect(document.location.href);
let pseudo;
let teller = false;
let leader = false;
let chosen_card_to_play;
let total_round_number = 3;
let current_round_number = 0;
let cards_can_be_selected = true;
let players_list = [];
let current_view;
let teller_chose = false;

function sendPseudo() {
    pseudo = document.getElementById("pseudo-input").value;
    socket.emit('pseudo', pseudo);
    document.getElementById("pseudo").innerHTML = "Bienvenue " + pseudo + " !";
    document.getElementById("top-right-pseudo").innerHTML = "Pseudo : " + pseudo;
}


socket.on('change_view', function(view) {
    current_view = view;
    document.getElementsByClassName("current-view")[0].classList.remove("current-view");
    document.getElementById("vue-"+view).classList.add("current-view");
    cards_can_be_selected = true; // New view : cards can be selected again
    if(view === 'C'){
        // change round number on top left
        current_round_number += 1;
        phrase_next_turn();
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
    else if(view === 'D' && teller){
        cards_can_be_selected = false; // Block card selection
    }

    // Display timer for views C and D
    if(view === 'C' || view === 'D') {
        document.getElementById("top-middle-timer").innerHTML = "";
        document.getElementById("top-middle-timer").style = "";
    } else {
        document.getElementById("top-middle-timer").style = "display:none";
    }
});

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

function phrase_next_turn(){    
    document.getElementById("next-turn-button").value = "Conteur suivant !";
    if(current_round_number/players_list.length == Math.ceil(current_round_number/players_list.length)){
        // Nouveau tour
        document.getElementById("next-turn-button").value = "Tour suivant !";
        if(Math.ceil((current_round_number+players_list.length)/players_list.length) == total_round_number){
            document.getElementById("next-turn-button").value = "Dernier tour !";
        }            
    }
}

// Liste des joueurs
socket.on('players_list', function(list) {
    players_list = list;
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

function sendRoundNumber() {
    let round_number = document.getElementById("round-number-input").value;
    if(round_number<=0) {
        display_message_snackbar("Tu dois choisir un nombre strictement positif !");
    } else {
        socket.emit("total_round_number", round_number);
    }
}

socket.on('send_total_round_number', function(number) {
    total_round_number = number;
    let round_number = document.getElementById("round-number");
    if(number==1) {
        round_number.innerHTML = number + " tour";
    } else {
        round_number.innerHTML = number + " tours";
    }
});


socket.on('tirage', function(cartes){
    for (var i = 0; i < cartes.length; i++) {
        document.getElementById("carte"+i).src = cartes[i];
    }
});

socket.on('new_teller', function(pseudo_teller) {
    teller_chose = false;
    // Re initialize
    document.getElementById("title-after-vote").innerHTML ="";
    if(leader) {
        change_style_of_class("show-after-vote-for-leader", "display:none");
    }

    let c = document.getElementsByClassName("teller")[0];
    if(pseudo==pseudo_teller) {
        teller=true;
        c.innerHTML = "Tu es le conteur, choisis une carte et ta phrase.";
        change_style_of_class("hide-if-teller", "display:none"); 
        change_style_of_class("hide-if-not-teller", ""); 
    } else {
        change_style_of_class("hide-if-not-teller", "display:none"); 
        change_style_of_class("hide-if-teller", ""); 
        // hide before the teller chooses its card
        change_style_of_class("hide-before-teller-choice", "display:none");  
        teller=false;
        c.innerHTML = "Le conteur est : <span id=\"teller-pseudo\">" + pseudo_teller + "</span>. Attends qu'il ait choisi sa carte."
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
        document.getElementsByClassName("teller")[0].innerHTML = "Les autres joueurs sont en train de choisir leurs cartes.";
    } else {
        change_style_of_class("hide-before-teller-choice", "");
        document.getElementsByClassName("teller")[0].innerHTML = "";  
    }  
    teller_chose = true;

});

function cardToPlayChosen() {
    if(teller) {
        display_message_snackbar("Tu ne vas pas donner 2 cartes !");
    } else {
        if(document.getElementsByClassName("carte-choisie").length==0){
            display_message_snackbar("N'oublie pas de sélectionner une carte d'abord !");
        } else {
            let carte = document.getElementsByClassName("carte-choisie")[0];
            chosen_card_to_play = carte.src;
            socket.emit('guesser_card_to_play', chosen_card_to_play);
        }
    }
}

socket.on('card_received', function() {
    document.getElementById("inst-with-keyphrase").innerHTML="Bien noté ! Attendons les autres joueurs..."
    let to_hide = document.getElementById("choose-card-to-play");
    to_hide.style="display:none";
    cards_can_be_selected = false;
});

socket.on('start_guessing', function(nbJoueurs, cartes){
    populatePlateau(nbJoueurs, cartes);
});



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
                socket.emit('guesser_choice', pseudo, src);

                //Change title
                change_style_of_class("hide-after-vote", "display:none");
                document.getElementById("title-after-vote").innerHTML = "Vote enregistré ! Attendons les autres joueurs...";
                cards_can_be_selected = false; // Block card selection
            }                        
        }
    }    
}



socket.on('show_votes', function(players_list, teller_pseudo, chosen_cards, guesses) {
    //Change title
    change_style_of_class("hide-after-vote", "display:none");
    if(leader) {
        change_style_of_class("show-after-vote-for-leader", "");
    }
    
    document.getElementById("title-after-vote").innerHTML = "Voici les résultats des votes";

    socket.emit('get_round_votes');

    //Remove selection halo around card
    if(document.getElementsByClassName("carte-choisie-d")>0) {
        let card_selected = document.getElementsByClassName("carte-choisie-d")[0].classList.remove("carte-choisie-d");
    }
    
    //Show button to reveal scores for the leader
    if(leader) {
        document.getElementById("reveal-total-scores-button").style="";
    }
    
    //Show results of votes 
    let card_list = document.getElementsByClassName("carte-d");
    for(let i=0; i<players_list.length; i++){
        let name = players_list[i];
        if(name==teller_pseudo) { // the teller didn't vote
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

    //Show who chose the cards
    for(let i=0; i<players_list.length; i++){
        let name = players_list[i];
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
});


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
    
    let ul = document.getElementById("players-scores-list");
    
    while (ul.hasChildNodes()) {  
        ul.removeChild(ul.firstChild);
    }

    for (let i=0; i<scores.length ; i++) {
        let li = document.createElement("li");
        li.appendChild(document.createTextNode(scores[i][0] + " : " + scores[i][1] + " points"));
        ul.appendChild(li);
    }
});


socket.on('show_round_votes', function(round_scores){
    showRoundVotes(round_scores);
});

function showRoundVotes(round_scores){    
    cards_can_be_selected = false; // Block card selection
    let title = document.getElementById("title-after-vote");
    let table = document.createElement("table");
    table.id = "round-scores";
    table.classList.add("round-scores-table");
    let tbody = document.createElement("tbody");
    let players_row = document.createElement("tr");
    let scores_row = document.createElement("tr");
    for(let player in round_scores){
        let th = document.createElement("th");
        let td = document.createElement("td");
        th.innerHTML = player;
        td.innerHTML = "+ "+round_scores[player];
        players_row.appendChild(th);
        scores_row.appendChild(td);
    }
    tbody.appendChild(players_row);
    tbody.appendChild(scores_row);
    table.appendChild(tbody);
    title.parentNode.appendChild(table);
}

function cardSelected(id){
    if(!cards_can_be_selected) {return;}
    if(document.getElementsByClassName("carte-choisie").length>0){
        document.getElementsByClassName("carte-choisie")[0].classList.remove("carte-choisie");
    }
    document.getElementById(id).classList.add("carte-choisie");
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

socket.on('scores', function(scores) {
    //scores = scores.sort(function(first, second) { return second[1] - first[1]; });
    let table = document.getElementById("scores-table");
    let players_row = document.createElement("tr");
    let scores_row = document.createElement("tr");
    for(let player in scores){
        let th = document.createElement("th");
        let td = document.createElement("td");
        th.innerHTML = player;
        td.innerHTML = scores[player];
        players_row.appendChild(th);
        scores_row.appendChild(td);
    }
    table.appendChild(players_row);
    table.appendChild(scores_row);
});


socket.on('redirect', function(destination) {
    window.location.href = destination;
})

function change_style_of_class(class_name, new_style) {
    for(let i=0; i<document.getElementsByClassName(class_name).length; i++){
        document.getElementsByClassName(class_name)[i].style = new_style;
    }
}



// Message du serveur
socket.on('message', function(message) {
    display_message_snackbar(message);
})


function display_message_snackbar(message) {
    // Get the snackbar DIV
    let x = document.getElementById("snackbar");

    // Add the "show" class to DIV 
    x.className = "show";

    // Add message
    x.innerHTML = message;

    // After 3 seconds, remove the show class from DIV and remove message
    setTimeout(function(){ x.className = x.className.replace("show", ""); x.innerHTML = ""; }, 3000);
}

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
    /* Tableau des scores de la partie */
    let scores_table = document.getElementById("scores-table");
    while(scores_table.hasChildNodes()){
        scores_table.removeChild(scores_table.childNodes[0]);
    }

    /* Tableau des scores généraux */
    let table = document.getElementById("round-scores");
    if(table){
        table.parentNode.removeChild(table);
    }
}

function resetConfirmationMessage(){
    document.getElementById("inst-with-keyphrase").innerHTML = "Choisis ta carte qui se rapporte le mieux à : <span class=\"phrase-clef\"></span>";
}

function resetTellerPhrase(){
    document.getElementById("phrase-clef-input-text").value = "";
}