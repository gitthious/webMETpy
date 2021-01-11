/*
encoding utf-8
© Thierry hervé
*/

var VisuInterventions = function() {
	
	/* pour supprimer en cas de rechargement de la page 
	   ou de relance du serveur web */
	
	d3.select("#interventions").select("ul").remove();
	
	var elt = d3.select("#interventions").append("ul")
	
	this.update = function (){
		
		// reorg events
		var evts = data.events;
		if(!evts){ return; }
		var interventions = [];
		/*
			Une intervention est identifiée avec les champs agent, intervention, args, donc sans l'heure donc une par ligne.
			Les "encours" sont ajoutés à chaque intervention "début".
			Cette implémentation n'est pas très efficace mais ça le fait tant qu'il n'y
			a pas trop d'interventions.
		*/
		
		for(i=0; i<evts.length; i++){
			var e = evts[i];
			if( e.__class__ != "CRIntervention") continue;
			if( e.encours == "début") {
				interventions.unshift([e.dt, e.agent, e.intervention, e.args , []]);
				
			} else {
				// il faut permettre d'afficher un en cours incohérent
				//ex. avant un début, après une fin
				for(j=0; j<interventions.length; j++){
					var [dt, agent, intervention, args, encours] = interventions[j];
					if(    e.dt >= dt 
						&& agent == e.agent 
						&& intervention == e.intervention 
						&& args == e.args){
							encours.unshift(e.dt.toLocaleTimeString() + ': ' + e.encours)
							break
						}
				}
			}
		}
		//console.log("VisuInterventions.update",interventions)
		elt.selectAll('li')
			.data(interventions, d => d)
			.join('li')
				.classed('intervention', true)
				.text(d => d[0].toLocaleTimeString() + ': ' + d[1] + ' ' + d[2] + ' ' + d[3])
				.append('ul')
					.classed('intervention_encours', true)
					.selectAll('li')
						.data(d => d[4])
						.join('li')
							.classed('encours', true)
							.text(d => d)
				/*
				.each( function (d) {
					d3.select(this).append('ul')
						.classed('intervention_encours', true)
						.selectAll('li')
							.data(d[4])
							.join('li')
								.classed('encours', true)
								.text(d => d)
				});
				*/
	}

	this.update();
	
}

