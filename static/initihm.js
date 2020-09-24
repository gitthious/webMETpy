/*
encoding utf-8
© Thierry hervé
*/

var socket; // the websocket
var wtick, button_play, button_stop, button_step, wdateheure_debut, wfacteur_temps;
var data = null;
var chrono, ligne, agents, menu;
var where_drop;
var button_savesim, button_loadsim, button_geninit;
var selecteur;

function tick_vers_dateheure(tick){
	//console.log("tick_vers_dateheure", tick, data)
	if(data.dateheure_debut){
		let dh = moment(data.dateheure_debut);
		dh.add(tick/data.facteur_temps, 's');
		return dh.toDate(); 
	} else {
		return null;
	}
}

function setup() {
	
	noCanvas();

	// connect to server:
	socket = io('/');

	wtick = select("#tick");
	wdateheure_debut = select("#dateheure_debut")
	wfacteur_temps = select("#wfacteur_temps")
	
	button_play = select("#play_pause");
	button_play.mousePressed(() => {
		socket.emit('play_pause');
	});
	button_stop = select("#stop");
	button_stop.mousePressed(() => {
		socket.emit('stop');
	});
	button_step = select("#step")
	button_step.mousePressed(() => {
		socket.emit('step');
	});
	
	button_loadsim = select("#loadsim");
	button_loadsim.mousePressed(() => {
		socket.emit('loadsim', select("#loaded_url").value());
	});
 
	button_savesim = select("#savesim");
	button_savesim.mousePressed(() => {
		socket.emit('savesim', select("#saved_url").value());
	});
	button_geninit = select("#geninit");
	button_geninit.mousePressed(() => {
		socket.emit('geninit');
	});

	menu = new Menu();

	
	time_factor_ctrl = select("#time_factor");

	socket.on('tick', (tick) => {
		wtick.html(tick);
		dh = tick_vers_dateheure(tick);
		chrono.update_temps_courant(dh);
		wdateheure_debut.html(dh ? dh.toLocaleString() : '?');
	});
	
	socket.on('CR', (contenu) => {
		evt = {dt: tick_vers_dateheure(contenu.tick), nom: contenu.msg}
		//console.log('onCR', evt, contenu);
		data.events.push(evt);
		chrono.update(data.events);
	});
	
	socket.on('connected', () => {
		wtick.html("connecté");
			
	});

	socket.on('connect_error', (error) => {
		wtick.html("Non connecté: " + error);
		button_play.attribute('disabled', true)
		button_step.attribute('disabled', true);
		button_stop.attribute('disabled', true);
		button_geninit.attribute('disabled', true);
	});
	
	socket.on('sim.started', () => {
		button_play.html("Pause");
		button_play.removeAttribute('disabled')
		button_step.attribute('disabled', true);
		button_stop.removeAttribute('disabled');
		button_loadsim.attribute('disabled', true);
		button_geninit.attribute('disabled', true);
	})
	socket.on('sim.paused', () => {
		button_play.html("Play");
		button_play.removeAttribute('disabled')
		button_step.removeAttribute('disabled');
		button_stop.removeAttribute('disabled');
		button_loadsim.attribute('disabled', true);
		button_geninit.attribute('disabled', true);
	})
	socket.on('sim.resumed', () => {
		button_play.html("Pause");
		button_play.removeAttribute('disabled')
		button_step.attribute('disabled', true);
		button_stop.removeAttribute('disabled');
		button_loadsim.attribute('disabled', true);
		button_geninit.attribute('disabled', true);
	})
	socket.on('sim.stoped', () => {
		button_play.html("Play");
		button_play.removeAttribute('disabled')
		button_step.attribute('disabled', true);
		button_stop.attribute('disabled', true);
		button_loadsim.removeAttribute('disabled');
		button_geninit.removeAttribute('disabled');
		wtick.html("connecté");
	})

	socket.on('update', (msg) => {
		//console.log('update', msg);
		if( msg.type == "agents_RATP") {
			for (let i = 0; i < data.agents_RATP.length; i++) {
				if(data.agents_RATP[i].clef == msg.obj){
					data.agents_RATP[i].localisation = msg.localisation;
					break;
				}
			}
		} else if( msg.type == "GroupeVoyageurs") {
			//console.log(msg);
			// spécifique à cause des perf. => moche
			for (let i = 0; i < data.groupes_voyageurs.length; i++) {
				if(data.groupes_voyageurs[i].clef == msg.clef){
					data.groupes_voyageurs[i].localisation = msg.obj.localisation;
					break;
				}
			}

		} else if( msg.type == "Navette") {
			for (let i = 0; i < data.navettes.length; i++) {
				if(data.navettes[i].clef == msg.obj){
					//console.log("update Navette msg", msg);
					if(msg.nombre_de_voyageurs){
						data.navettes[i].nombre_de_voyageurs = msg.nombre_de_voyageurs;
					}
					if(msg.etat){
						data.navettes[i].etat = msg.etat;
					}
					//console.log("update Navette obj", data.navettes[i]);
					break;
				}
			}
		} else {
			console.log("update non implémenté pour " + msg.type)
		}
		ligne.update();
	})

	
	socket.on('init_data', (msg) => {
		data = msg; // attention ici à la variable data qui est globale!
		//console.log('init_data', data);

		// converti les string en date javascript
		if(data.events) {
			for(e of data.events) {
				e.dt = moment(e.dt['__datetime__']).toDate();
			}
		}
		//console.log('init_data.dateheure_debut', data.dateheure_debut );
		if(data.dateheure_debut){
			//console.log("dateheure_debut OK")
			data.dateheure_debut = moment(data.dateheure_debut['__datetime__']).toDate();
			wdateheure_debut.html(data.dateheure_debut.toLocaleString());
			wfacteur_temps.html("x"+data.facteur_temps);
		} 
		else {
			//console.log("dateheure_debut KO")
			wdateheure_debut.html("?");
		}
		
		//console.log("comportements_ihm", data.comportements_ihm);
		
		
		ligne = new VisuLigne(data);
		chrono = new VisuChronoSimple(data.dateheure_debut, data.duree);
		agents = new VisuAgent();

		ligne.update();
		chrono.update(data.events);	
		agents.update(data.agents_RATP, data.agents_vivier);
		
		selecteur =  new Selecteur();

		//selecteur.showinfo("Cliquez sur :"+selecteur.types_a_selectionner().join());
	})	
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

function change_time_factor(ev){
	socket.emit('change_time_factor', time_factor_ctrl.value());
}

function draw() {
	// ne fait rien mais draw() est utile pour p5.js.
}

