/*
encoding utf-8
© Thierry hervé
*/

var chrono,  menu; 
var vues = [];
var selecteur;
var index_data = new Map(); 

// Pour faire un sélecteur spécifique à chaque vue
var types_agents_selectionnables;

/*
	Doit être définie par le produit. Elle doit être de la forme:
new Map([	
	['type (nom de classe)', 'nom attr dans data'],
])

var update_map;
*/


function setup() {
	
	noCanvas();


	// Voir comment on peut tester si présent ou non
	menu = new Menu();

	
	socket.on('EVT', (evt) => {
		//console.log("on.EVT", evt);
		evt.dt = moment(evt.dt.__datetime__).toDate();
		data.events.push(evt);
		update_vues();
	});


	socket.on('init_data', (msg) => {
		data = msg; // attention ici à la variable data qui est globale!
		index_data = new Map(); 
		indexe_objet(data);
		
		console.log('init_data', data);

		// converti les string en date javascript
		if(data.events) {
			//console.log('nb events', data.events);
			for(e of data.events) {
				e.dt = moment(e.dt['__datetime__']).toDate();
			}
		}
		//console.log('init_data.dateheure_debut', data.dateheure_debut );
		if(data.dateheure_debut){
			//console.log("dateheure_debut OK")
			data.dateheure_debut = moment(data.dateheure_debut['__datetime__']).toDate();
			if(wdateheure_debut){
				wdateheure_debut.html(data.dateheure_debut.toLocaleString());
				//wfacteur_temps.html("x"+data.facteur_temps);
			}
		} 
		else {
			//console.log("dateheure_debut KO")
			if(wdateheure_debut){
				wdateheure_debut.html("?");
			}
		}


		// pour ne les créer qu'une fois
		if( vues.length == 0){
			vues = create_vues();
			selecteur =  new Selecteur(vues);
		}
	
		update_vues();

	});
	
	socket.on('update', (msg) => {
		//console.log('on update', msg);
		obj = index_data[msg.clef];
		if(!obj){
			console.log("Attention, update de l'objet clef =", msg.clef, " non indexé!");
			return;
		}
		for(const att in msg.obj) {
			if( att == '__class__') { continue; }
			obj[att] = msg.obj[att];
		}
		
		// mise à jour des vues
		for(var v=0; v < vues.length; v++){
			/*
				update fonctionne car toutes vues sauf leafletmap.js ont
				une fonction update sans param et se basent sur data pour leur update.
			*/
			vues[v].update(msg.clef, msg.obj); 
		}
	});
}

function update_vues(){
	for(var v=0; v < vues.length; v++){
		vues[v].update();
	}
}


function draw() {
	// ne fait rien mais draw() est utile pour p5.js.
}

function indexe_objet(obj){
	if( ! obj ){ return;}
	for( att in obj){
		// si c'est un objet provenant de la sim 
		// et qu'il est indexable (il a une clef)
		if( att == '__class__' && obj.hasOwnProperty('clef')){
			if( obj.clef in index_data){
				//console.log("Attention: objet déjà indexé!", obj);
				return;
			}
			index_data[obj.clef] = obj;
		}
		if(    att.startsWith('_') 
			|| !Array.isArray(obj[att])
			|| att == "comportements"
			|| att == "localisation" || att == "coordinates"){ 
			continue;
		}
		const o = obj[att];
		//console.log(att);
		for(i=0; i <= o.length; i++){
		// on déclenche récusivement l'indexation des sous objets
			indexe_objet(o[i]);
		}
	}
	
}
