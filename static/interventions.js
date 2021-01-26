/*
encoding utf-8
© Thierry hervé
*/

var VisuInterventions = function() {
	var filtre = "pasfiltre";
	
	/* pour supprimer en cas de rechargement de la page 
	   ou de relance du serveur web */
	
	d3.select("#interventions").select("nav").remove();
	
	var nav = d3.select("#interventions")
		.append("nav")
			.classed("interventions", true);
		
	nav.append("input")
		.attr('type', "radio").attr('id', "pasfiltre")
		.attr('name', "filtres").attr('value', "pasfiltre")
		.attr('checked', "yes")
		.on("click", function(){
			filtre = "pasfiltre";
			render();
		});
	nav.append("label")
		.attr('for', "pasfiltre")
		.html("Toutes");

	nav.append("input")
		.attr('type', "radio").attr('id', "encours")
		.attr('name', "filtres").attr('value', "encours")
		.on("click", function(){
			filtre = "encours";
			render();
		});
	nav.append("label")
		.attr('for', "encours")
		.html("En cours");

	nav.append("input")
		.attr('type', "radio").attr('id', "fin")
		.attr('name', "filtres").attr('value', "fin")
		.on("click", function(){
			filtre = "fin";
			render();
		});
	nav.append("label")
		.attr('for', "fin")
		.html("Terminées");

	nav.append("input")
		.attr('type', "radio").attr('id', "dmd")
		.attr('name', "filtres").attr('value', "dmd")
		.on("click", function(){
			filtre = "dmd";
			render();
		});
	nav.append("label")
		.attr('for', "dmd")
		.html("En attentes");
				
	var elt = nav.append('ul');

	var interventions = [];

	this.update = function (){
		if(!selecteur) return;
		// reorg events
		//console.log("VisuInterventions.update",data.events)
		var evts = data.events;
		if(!evts){ return; }
		interventions = [];
		/*
			Une intervention est identifiée avec les champs agent, intervention, args, donc sans l'heure donc une par ligne.
			Les "encours" sont ajoutés à chaque intervention "début".
			Cette implémentation n'est pas très efficace mais ça le fait tant qu'il n'y
			a pas trop d'interventions.
		*/
		var dmd = null;
		for(i=0; i<evts.length; i++){
			var e = evts[i];
			if( ! (e.__class__ == "CRIntervention" || e.__class__ == "Dmd") ) continue;
			if( e.encours == "début" || e.encours == "debut") {
				interventions.unshift([e.dt, e.agent, e.intervention, e.args , []]);
			} else {
				// il faut permettre d'afficher un en cours incohérent
				//ex. avant un début, après une fin
				for(j=0; j<interventions.length; j++){
					//console.log(interventions[j], e)
					var [dt, agent, intervention, args, encours] = interventions[j];
					if(    e.dt >= dt 
						&& agent == e.agent 
						&& intervention == e.intervention 
						&& args == e.args){
							encours.unshift(e.dt.toLocaleTimeString() + ': ' + e.encours)
							//break
					}
				}
			}
		}
		
		render();
	}
	
	function a_afficher(intervention){
		encours = intervention[4];
		if(filtre == "encours"){
			if(encours.length == 0) return true;
			if(encours[0].search("fin") != -1) return false;
		} else if(filtre=="fin") {
			if(encours.length == 0) return false;
			if(encours[0].search("fin") != -1) return true;
			return false;
		} else if(filtre=="dmd") {
			if(encours.length == 0) return false;
			if(encours[0].search("dmd") != -1) return true;
			return false;
		}
		return true;
	}
	
	function render() {
		//console.log("VisuInterventions.update",interventions)
		elt.selectAll('li')
			.data(interventions.filter(i => a_afficher(i)), d => d)
			.join('li')
				.classed('intervention', true)
				.classed('finie', function (d){
					// on ajoute une classe css suplémentaire si l'intervention est finie
					for(var e=0; e<d[4].length; e++){
						if(d[4][e].search("fin") != -1){
							return true;
						}
					}
					return false;
				})
				.classed('dmd', function (d){
					// on ajoute une classe css suplémentaire si l'intervention est finie
					if(d[4].length > 0){
						if( d[4][0].search("dmd") != -1){
							return true;
						}
					}
					return false;
				})
				.text(d => d[0].toLocaleTimeString() + ': ' + d[1] + ' ' + d[2] + ' ' + d[3])
				.append('ul')
					.classed('intervention_encours', true)
					.selectAll('li')
						.data(d => d[4])
						.join('li')
							.classed('encours', true)
							.text(d => d)
							// ça ne fonctionne pas car on ne manipule pas un "type selectionnable"
							// on abandonne pour l'instant
							// mais le mouseenter et leave fonctionnent
							//.call(selecteur.on("AgentExploitation", "interventions"));
	}

	this.update();
	
}

