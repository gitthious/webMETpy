/*
encoding utf-8
© Thierry hervé
*/

var VisuInterventions = function(parent_selector="#interventions") {
	var filtre = "pasfiltre";
	
	/* pour supprimer en cas de rechargement de la page 
	   ou de relance du serveur web */
	
	d3.select(parent_selector).select("nav").remove();
	
	var nav = d3.select(parent_selector)
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

	/*
		Une intervention est identifiée (clef) par : 
			date, agent, nom d'intervention, args 
		Elle contient une liste "d'encours"
		On ne crée pas une map simplement pour l'affichage
		en d3 qui veut une liste de listes
	*/
	var interventions = [];

	this.update = function (evt){
		console.log("VisuInterventions.update", evt);

		// l'évenement n'est pas une intervention
		if( ! (evt.__class__ == "CRIntervention" || evt.__class__ == "Dmd") ) return;
		
		// on ajoute une intervention en supposant que les événements arrivent toujours
		// avec une date dans l'ordre chronologique 
		// (idélalement il ne faudrait pas suposer cela)
		if( evt.encours == "début" || evt.encours == "debut") {

			// ajoute l'intervention au début (comme 'unshift' ne l'indique pas!)
			// avaec une liset "d'en cours" vide, puisque c'est un début d'intervention
			interventions.unshift([evt.dt, evt.agent, evt.nom, evt.args , []]);

		} else {
			/*
				Idéalement, il faudrait permettre d'afficher un "en cours" incohérent
				par ex. qui arriverait avant un début, après une fin.
				On ne le fait pas!
			*/

			// recherche l'intervention et insert l'encours
			for(let j=0; j<interventions.length; j++){

				var [dt, agent, nom, args, encours] = interventions[j];
				if(    evt.dt >= dt 
					&& agent == evt.agent 
					&& nom == evt.nom 
					&& args == evt.args){
						encours.unshift(evt.dt.toLocaleTimeString() + ': ' + evt.encours)
						break
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
	
}

