window.onbeforeunload = function() {
    return "Il est déconseillé d'actualiser cette page, vous allez sortir de la partie !";
}

let socket = io.connect(document.location.href);
let pseudo;
let counter=false;
let leader=false;
let chosen_card_to_play;

function sendPseudo() {
    pseudo = document.getElementById("pseudo-input").value;
    socket.emit('pseudo', pseudo);
    document.getElementById("pseudo").innerHTML = "Bienvenue " + pseudo + " !";
}


socket.on('change_view', function(view) {
    document.getElementById("message-server").innerHTML = "";
    document.getElementsByClassName("current-view")[0].classList.remove("current-view");
    document.getElementById("vue-"+view).classList.add("current-view");
    if(view==='C'){
        socket.emit('tirage');
    }

})

// Liste des joueurs
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


socket.on('tirage', function(cartes){
    for (var i = 0; i < cartes.length; i++) {
        document.getElementById("carte"+i).src = cartes[i];
    }
});

socket.on('new_counter', function(pseudo_counter) {
    // Re initialize
    document.getElementById("title-after-vote").innerHTML ="";
    if(leader) {
        change_style_of_class("show-after-vote-for-leader", "display:none");
    }

    let c = document.getElementsByClassName("counter")[0];
    if(pseudo==pseudo_counter) {
        counter=true;
        c.innerHTML = "Tu es le conteur, choisis une carte et ta phrase.";
        change_style_of_class("hide-if-counter", "display:none"); 
        change_style_of_class("hide-if-not-counter", ""); 
    } else {
        change_style_of_class("hide-if-not-counter", "display:none"); 
        change_style_of_class("hide-if-counter", ""); 
        // hide before the counter chooses its card
        change_style_of_class("hide-before-counter-choice", "display:none");  
        counter=false;
        c.innerHTML = "Le conteur est : " + pseudo_counter + ". Attends qu'il ait choisi sa carte."
    }
});

function sendKeyPhrase(){
    if(document.getElementsByClassName("carte-choisie").length==0){
        display_short_message("N'oublie pas de sélectionner une carte d'abord !");
    } else {
        let carte = document.getElementsByClassName("carte-choisie")[0];
        let src = carte.src;
        key_phrase = document.getElementById("phrase-clef-input-text").value;
        socket.emit('counter_choice', src, key_phrase);
    }
}

socket.on('reveal_counter_choice', function(card, key_phrase) {
    for(let i=0; i<document.getElementsByClassName("phrase-clef").length; i++) {
        document.getElementsByClassName("phrase-clef")[i].innerHTML = key_phrase;
    }
    if(counter) {
        document.getElementById("phrase-clef-input").style="display:none";
        document.getElementsByClassName("counter")[0].innerHTML="Les autres joueurs sont en train de choisir leurs cartes.";
    } else {
        change_style_of_class("hide-before-counter-choice", "");
        document.getElementsByClassName("counter")[0].innerHTML="";                    
    }

});

function cardToPlayChosen() {
    if(counter) {
        display_short_message("Tu ne vas pas donner 2 cartes !");
    } else {
        if(document.getElementsByClassName("carte-choisie").length==0){
            display_short_message("N'oublie pas de sélectionner une carte d'abord !");
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
});

socket.on('start_guessing', function(nbJoueurs, cartes){
    populatePlateau(nbJoueurs, cartes);
});



function sendVote() {
    if(counter) {
        display_short_message("Tu ne peux pas voter, petit tricheur !");
    } else {
        if(document.getElementsByClassName("carte-choisie-d").length==0){
            display_short_message("N'oublie pas de sélectionner une carte d'abord !");
        } else {
            let carte = document.getElementsByClassName("carte-choisie-d")[0];
            let src = carte.src;

            if (chosen_card_to_play == src){
                display_short_message("Tu ne peux pas voter pour ta propre carte, petit tricheur !");
            } else {
                socket.emit('guesser_choice', pseudo, src);

                //Change title
                change_style_of_class("hide-after-vote", "display:none");
                document.getElementById("title-after-vote").innerHTML = "Vote enregistré ! Attendons les autres joueurs...";
            }                        
        }
    }
}



socket.on('show_votes', function(players_list, counter_pseudo, chosen_cards, guesses) {
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
        if(name==counter_pseudo) { // the teller didn't vote
            continue;
    }
    let card = guesses[name];

    for(let j=0; j<card_list.length; j++) {
        if(card_list[j].src.endsWith(card)) {
            var newDiv = document.createElement("div");
            var newContent = document.createTextNode(name);
            newDiv.appendChild(newContent);
            card_list[j].parentNode.insertBefore(newDiv, card_list[j].nextSibling);
            console.log("Votes ajoutés ");
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
                var newContent = document.createTextNode("Carte de " + name);
                newDiv.appendChild(newContent);

                card_list[j].parentNode.insertBefore(newDiv, card_list[j]);

                //Add selection halo around counter card
                if(name==counter_pseudo) {
                    card_list[j].classList.add("reveal-counter-card");
                }
                break;
            }
        }
    }
});

socket.on('show_round_votes', function(round_scores){
    showRoundVotes(round_scores);
});

function showRoundVotes(round_scores){    
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
    console.log(round_scores);
}

function cardSelected(id){
    if(document.getElementsByClassName("carte-choisie").length>0){
        document.getElementsByClassName("carte-choisie")[0].classList.remove("carte-choisie");
    }
    document.getElementById(id).classList.add("carte-choisie");
}

function cardSelectedD(id){
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

socket.on("scores", function(scores){
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


function change_style_of_class(class_name, new_style) {
    console.log(class_name);
    for(let i=0; i<document.getElementsByClassName(class_name).length; i++){
        console.log(document.getElementsByClassName(class_name)[i]);
        document.getElementsByClassName(class_name)[i].style = new_style;
    }
}

// Message du serveur
socket.on('message', function(message) {
    display_short_message(message);
})

function display_short_message(message) {
    document.getElementById("message-server").innerHTML = message;
    setTimeout(function() {
        document.getElementById("message-server").innerHTML = ''; 
    }, 1000);
}


