const cartesDossier = './cartes';
const cartesDossierNoRel = cartesDossier.replace('./', '')+'/';
const fs = require('fs');

/** Variables globales **/
let cartes = []
let pile = []
let defausse = []

/** Charge les noms des fichiers dans le tableau "cartes" **/
function chargerCartes(){
	fs.readdirSync(cartesDossier).forEach(file => { // Lire les noms des fichiers de manière synchrone
		cartes.push(cartesDossierNoRel+file);
		pile.push(cartesDossierNoRel+file);
	});
	cartes.sort(function(a, b){return a.split(".")[0] - b.split(".")[0]}) // Trier le tableau par ordre numérique
	pile.sort(function(a, b){return a.split(".")[0] - b.split(".")[0]}) // Trier le tableau par ordre numérique
	return cartes;
}

/** Tirer une carte et gérer le manque de cartes dans la pile **/
function tirerCarte(){
	if(pile.length == 0) { 
		viderDefausse(); // Il n'y a plus de cartes dans la pile : on en récupère dans la défausse
	}
	const position = randInt(0, pile.length); 
	const carte = pile[position]; // On tire une carte au hasard
	pile.splice(position, 1); // On enlève la carte de la pile
	return carte;
}

/** Choisir un entier aléatoire entre min (inclus) et max (exclus) **/
function randInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

/** Vider la défausse dans la pile */
function viderDefausse(){
	pile = pile.concat(defausse); // On remet les cartes de la défausse dans le paquet
	defausse = []; // La défausse est vide
}


/** Renvoie toutes les cartes **/
function getToutesCartes(){
	return cartes;
}

/** Renvoie les cartes disponibles (pile) **/
function getPile(){
	return pile;
}

/** Renvoie la défausse **/
function getDefausse(){
	return defausse;
}

/** Tire *nombre* cartes au hasard **/
function tirerCartes(nombre){
	let main = [] // Le tableau contenant les cartes tirées
	while(main.length < nombre) {
		main.push(tirerCarte()); // tirerCarte gère automatiquement le manque éventuel de cartes dans la pile
	}
	return main;
}

/** Défausse les cartes contenues dans *cartes* **/
function defausserCartes(cartes){
	for(let i = 0 ; i < cartes.length ; i++) {
		defausse.push(cartes[i]);
	}
}


chargerCartes(); // On charge toutes les cartes du dossier

// Exporter les fonctions
exports.getToutesCartes = getToutesCartes; 
exports.getPile = getPile; 
exports.tirerCartes = tirerCartes;
exports.defausserCartes = defausserCartes;
exports.getDefausse = getDefausse;
exports.tirerCarte = tirerCarte;
exports.dossierCartes = cartesDossierNoRel;
exports.chargerCartes = chargerCartes;
