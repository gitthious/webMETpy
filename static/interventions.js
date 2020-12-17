/*
encoding utf-8
© Thierry hervé
*/

var VisuInterventions = function() {
	
	/* pour supprimer en cas de rechargement de la page 
	   ou de relance du serveur web */
	columns = [
		"heure", 
		"agent", 
		"intervention",
		"args",
		"encours"
		];
	
	d3.select("#interventions").select("table").remove();

	var table = d3.select("#interventions")
		.append("table")
			.attr('class', 'interventions')

	var thead = table.append('thead')
	var	tbody = table.append('tbody');
			
	// append the header row
	thead.append('tr')
		.selectAll('th')
		.data(columns)
		.join('th')
			.text(col => col);
	
	
	this.update = function (){
		
		// reorg events
		var evts = data.events;
		if(!evts){ return; }
		//evts = evts.filter(e => );
		var E = [];
		for(i=0; i<evts.length; i++){
			var e = evts[i];
			if( e.__class__ != "CRIntervention") continue;
			E.push([e.dt.toLocaleTimeString(), e.agent, e.intervention, e.args, e.encours]);
		}
		console.log("VisuInterventions.update",E)
		tbody.selectAll('tr')
			.data(E)
			.join("tr")
				.selectAll("td")
				.data(d => d)
				.join("td")
					.text(d => d);
	}

	this.update();
	
}