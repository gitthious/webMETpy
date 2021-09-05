/*
encoding utf-8
© Thierry hervé
*/

var VisuChronoSimple = function(parent_selector="#chrono") {
	var filtre_evt_text = "";
	var filtrer_evt_blanc = false;
	var events = [];
	
	/* pour supprimer en cas de rechargement de la page 
	   ou de relance du serveur web */
	d3.select(parent_selector).select("nav").remove();

	var nav = d3.select(parent_selector)
		.append("nav")
			.attr('class', 'chronosimple')

	nav.append('input')
		.attr('type', "search")
		.attr("placeholder", "filtrage...")
		.on("keyup", function(){
			filtre_evt_text = this.value.toUpperCase();
			render_events();
		});
		
	nav.append("button")
		.html("Compact")
		.on("click", function(){
			var sel = d3.select(this);
			if( sel.html() == "Compact"){
				filtrer_evt_blanc = true;
				sel.html("Décompact");
			}
			else{
				filtrer_evt_blanc = false;
				sel.html("Compact");
			}
			render_events();
		});
		
	/*
		1 min == 1px =>  2 heures == 120px
	*/
	var pixel_par_min = 1;
	nav.append("button")
		.html("1min")
		.on("click", function() {
			pixel_par_min = 1;
			render_events();
		})
	nav.append("button")
		.html("5min")
		.on("click", function() {
			pixel_par_min = 1/5;
			render_events();
		})
	nav.append("button")
		.html("10min")
		.on("click", function() {
			pixel_par_min = 1/10;
			render_events();
		})
	
	var ul = nav.append('ul');
	
	var events = []
	
	this.update = function (evt){
		console.log("VisuChronoSimple.update", evt);

		// On considère que les événements arrivent dans l'ordre
		// chronologique croissant
		if(evt.dt === undefined){
			console.log("Attention, événement sans champ 'dt' est ignoré", evt);
			return;
		}
		
		// calcul la durée depuis le dernier évenemtn enregistré
		// et ajout un événement caractérisant la durée sans autre événement
		evtpred = events.length != 0? events[0] : null;
		// durée en minutes
		duree = evtpred? Math.floor((evt.dt - evtpred.dt)/(60000)) : 0;
		if(duree > 1){
			// 1 minute avant l'évenement courant
			d = new Date(evt.dt.getTime() - 60000); 
			events.unshift({dt: d, nom: "", duree: duree});
		}
		
		// durée de l'un evt est toujours 0 mais peut poser 
		// un pb si on entre des evt avec durée (A revoir)
		evt.duree = 0; 
		events.unshift(evt);
		console.log(events)
		render_events();
	}
	
	function render_events(){		
		
		ul.selectAll("li")
			.data(events.filter(d => evt_a_afficher(d)), d => d.dt) //la date sert de clef
			.join("li")
				.attr('class', d => d.duree == 0 ? 'evtsimple': 'evtblanc')
				.style('padding-bottom', d => d.duree > 0 ? 
											Math.floor(d.duree*pixel_par_min)+"px" : "1px" )
				.text(d => d.nom != ""? d.dt.toLocaleTimeString()+": "+d.nom : " ")
				.filter(d => d.checkable)
					.append("span")
						.append("input")
							.attr("type", "checkbox")
	};
	

	function evt_a_afficher(evt){
		if( filtre_evt_text != ""){
			if( evt.nom.toUpperCase().indexOf(filtre_evt_text) == -1){
				return false;
			}
		}
		if(filtrer_evt_blanc){
			if(evt.nom == ""){
				return false;
			}
		}
		return true;
	}
	
}