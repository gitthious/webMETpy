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
		//console.log("VisuInterventions.update",data.events)
		var evts = data.events;
		if(!evts){ return; }
		var interventions = [];
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
		
		//console.log("VisuInterventions.update",interventions)
		elt.selectAll('li')
			.data(interventions, d => d)
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
	}

	this.update();
	
}

