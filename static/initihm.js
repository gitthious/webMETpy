/*
encoding utf-8
© Thierry hervé
*/

var socket; // the websocket
var wtick, button_play, button_stop, button_step, wdateheure_debut, wfacteur_temps;
var data = null;
var chrono,  menu; 
var vues = [];
var where_drop;
var button_savesim, button_loadsim, button_geninit;
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

function tick_vers_dateheure(tick){
	//console.log("tick_vers_dateheure", tick, data)
	if(!data) {return null;}
	if(data.dateheure_debut){
		let dh = moment(data.dateheure_debut);
		dh.add(tick/*/data.facteur_temps*/, 's');
		return dh.toDate(); 
	} else {
		return null;
	}
}

function setup() {
	
	noCanvas();

	// connect to server:
	//socket = io('/');

	wtick = select("#tick");
	
	wdateheure_debut = select("#dateheure_debut")
	wfacteur_temps = select("#wfacteur_temps")
	if(wfacteur_temps){
		wfacteur_temps.changed(() => {
			//console.log("change_time_factor", wfacteur_temps? wfacteur_temps.value() : wfacteur_temps)
			v = parseInt(wfacteur_temps.value());
			if(v){
				socket.emit('change_time_factor', v);
			}
			
		});
	}
	
	button_play = select("#play_pause");
	if(button_play){
		button_play.mousePressed(() => {
			socket.emit('play_pause');
		});
	}
	button_stop = select("#stop");
	if(button_stop){
		button_stop.mousePressed(() => {
			socket.emit('stop');
		});
	}
	button_step = select("#step")
	if(button_step){
		button_step.mousePressed(() => {
			socket.emit('step');
		});
	}
	button_loadsim = select("#loadsim");
	if(button_loadsim){
		button_loadsim.mousePressed(() => {
			socket.emit('loadsim', select("#loaded_url").value());
		});
	}
 
	button_savesim = select("#savesim");
	if(button_savesim){
		button_savesim.mousePressed(() => {
			socket.emit('savesim', select("#saved_url").value());
		});
	}
	button_geninit = select("#geninit");
	if(button_geninit){
		button_geninit.mousePressed(() => {
			socket.emit('gen');
		});
	}

	// Voir comment on peut tester si présent ou non
	menu = new Menu();

	socket.on('tick', (tick) => {
		if(wtick){
			wtick.html(tick);
			dh = tick_vers_dateheure(tick);
			if(wdateheure_debut){
				wdateheure_debut.html(dh ? dh.toLocaleString() : '?');
			}
		}
	});
	
	socket.on('EVT', (evt) => {
		//console.log("on.EVT", evt);
		evt.dt = moment(evt.dt.__datetime__).toDate();
		data.events.push(evt);
		update_vues();
	});
		
	socket.on('connected', () => {
		console.log("connected", socket)
		if(wtick){
			wtick.html("connecté");
		}
	});

	socket.on('connect_error', (error) => {
		if(wtick){
			wtick.html("Non connecté: " + error);
		}
		if(button_play){
			button_play.attribute('disabled', true)
			button_step.attribute('disabled', true);
			button_stop.attribute('disabled', true);
			button_geninit.attribute('disabled', true);
		}
	});
	
	socket.on('sim.factor', (factor) => {
		console.log('sim.factor', factor);
		if(wfacteur_temps){
			wfacteur_temps.value(1/factor);
		}
	});

	socket.on('sim.started', () => {
		if(button_play){
			button_play.html("Pause");
			button_play.removeAttribute('disabled')
			button_step.attribute('disabled', true);
			button_stop.removeAttribute('disabled');
			if(button_loadsim){
				button_loadsim.attribute('disabled', true);
			}
			button_geninit.attribute('disabled', true);
		}
	})
	socket.on('sim.paused', () => {
		if(button_play){
			button_play.html("Play");
			button_play.removeAttribute('disabled')
			button_step.removeAttribute('disabled');
			button_stop.removeAttribute('disabled');
			if(button_loadsim){
				button_loadsim.attribute('disabled', true);
			}
			button_geninit.attribute('disabled', true);
		}
	})
	socket.on('sim.resumed', () => {
		if(button_play){
			button_play.html("Pause");
			button_play.removeAttribute('disabled')
			button_step.attribute('disabled', true);
			button_stop.removeAttribute('disabled');
			if(button_loadsim){
				button_loadsim.attribute('disabled', true);
			}
			button_geninit.attribute('disabled', true);
		}
	})
	socket.on('sim.stoped', () => {
		if(button_play){
			button_play.html("Play");
			button_play.removeAttribute('disabled')
			button_step.attribute('disabled', true);
			button_stop.attribute('disabled', true);
			if(button_loadsim){
				button_loadsim.removeAttribute('disabled');
			}
			button_geninit.removeAttribute('disabled');
		}
		if(wtick){
			wtick.html("connecté");
		}
	})

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

function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData('text/plain', ev.target.id);
  //console.log("drag", ev.target.id);
}

function drop_acteur(ev) {
  ev.preventDefault();
  var agent = ev.dataTransfer.getData('text/plain');
  //console.log("drop_acteur", agent);
  if(where_drop == null) 
  { 
	console.log('drop_acteur: Attention, "where_drop" est null');
	return; 
  }
  //console.log("ordre do ", agent, "vers", where_drop.nom);
  socket.emit('faire_evacuer', agent, where_drop.nom);
};

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
