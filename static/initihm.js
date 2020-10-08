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

/*
	Doit être définie par le produit. Elle doit être de la forme:
new Map([	
	['type (nom de classe)', 'nom attr dans data'],
])
*/
var update_map;


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
			socket.emit('geninit');
		});
	}

	// Voir comment on peut tester si présent ou non
	menu = new Menu();

	
	time_factor_ctrl = select("#time_factor");

	socket.on('tick', (tick) => {
		if(wtick){
			wtick.html(tick);
			dh = tick_vers_dateheure(tick);
			chrono.update_temps_courant(dh);
			wdateheure_debut.html(dh ? dh.toLocaleString() : '?');
		}
	});
	
	socket.on('CR', (msg) => {
		let dh = moment(msg.dt.__datetime__);
		evt = {dt: dh.toDate(), nom: msg.nom};
		//console.log('onCR', 'evt', evt, 'msg', msg);
		data.events.push(evt);
		chrono.update(data.events);
	});
		
	socket.on('connected', () => {
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
	
	socket.on('sim.started', () => {
		if(button_play){
			button_play.html("Pause");
			button_play.removeAttribute('disabled')
			button_step.attribute('disabled', true);
			button_stop.removeAttribute('disabled');
			button_loadsim.attribute('disabled', true);
			button_geninit.attribute('disabled', true);
		}
	})
	socket.on('sim.paused', () => {
		if(button_play){
			button_play.html("Play");
			button_play.removeAttribute('disabled')
			button_step.removeAttribute('disabled');
			button_stop.removeAttribute('disabled');
			button_loadsim.attribute('disabled', true);
			button_geninit.attribute('disabled', true);
		}
	})
	socket.on('sim.resumed', () => {
		if(button_play){
			button_play.html("Pause");
			button_play.removeAttribute('disabled')
			button_step.attribute('disabled', true);
			button_stop.removeAttribute('disabled');
			button_loadsim.attribute('disabled', true);
			button_geninit.attribute('disabled', true);
		}
	})
	socket.on('sim.stoped', () => {
		if(button_play){
			button_play.html("Play");
			button_play.removeAttribute('disabled')
			button_step.attribute('disabled', true);
			button_stop.attribute('disabled', true);
			button_loadsim.removeAttribute('disabled');
			button_geninit.removeAttribute('disabled');
		}
		if(wtick){
			wtick.html("connecté");
		}
	})

	if(update_map === undefined) {
		window.alert("Pas d'update_map!");
	}
	
	socket.on('update', (msg) => {
		//console.log('on update', msg);
		
		if(update_map === undefined) {
			window.alert("Pas d'update_map!");
			return;
		}
		
		var nom_liste = update_map.get(msg.obj.__class__);
		if(nom_liste === undefined){
			console.log("update non implémenté pour " + msg.obj.__class__);
			return;
		}
		
		var liste = data[nom_liste];
		for (let i = 0; i < liste.length; i++) {
			if(liste[i].clef == msg.obj.clef){
				liste[i][msg.attr] = msg.obj[msg.attr];
				//console.log('on update', i, msg.attr, msg.obj, liste[i])
				break;
			}
		}

		for(var v=0; v < vues.length; v++){
			vues[v].update();
		}
	})

	
	socket.on('init_data', (msg) => {
		data = msg; // attention ici à la variable data qui est globale!
		//console.log('init_data', data);

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
				wfacteur_temps.html("x"+data.facteur_temps);
			}
		} 
		else {
			//console.log("dateheure_debut KO")
			if(wdateheure_debut){
				wdateheure_debut.html("?");
			}
		}
		
		//console.log("comportements_ihm", data.comportements_ihm);
		
		create_vues();
		
		// Voir comment on peut tester si présent ou non
		chrono = new VisuChronoSimple(data.dateheure_debut, data.duree);
		chrono.update(data.events);	

		update_vues();
		
		// Voir comment on peut tester si présent ou non
		selecteur =  new Selecteur();

	})	
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

function change_time_factor(ev){
	socket.emit('change_time_factor', time_factor_ctrl.value());
}

function draw() {
	// ne fait rien mais draw() est utile pour p5.js.
}

