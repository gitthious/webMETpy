/*
encoding utf-8
© Thierry hervé
*/

var VisuChronoSimple = function(temps_initial, plage_horaire) {
	/* pour supprimer en cas de rechargement de la page 
	   ou de relance du serveur web
	*/
	
	d3.select("#chrono").select("nav").remove();

	var focus = d3.select("#chrono")
		.append("nav")
			.attr('class', 'chronosimple')
			.append('ul')
	
	this.update = function (evts){
		if(evts){
			evts.sort((e1, e2) => e2.dt-e1.dt);
			focus.selectAll(".evtsimple")
				.data(evts, d => d.dt.toLocaleTimeString()+": "+d.nom) // tout le libellé sert d'index
				.join("li")
					.attr('class', 'evtsimple')
					.text(d => d.dt.toLocaleTimeString()+": "+d.nom);
		}
	};
	
	this.update_temps_courant = function(temps_courant){ // date js
		// ne fait rien
	};

}