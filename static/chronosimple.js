/*
encoding utf-8
© Thierry hervé
*/

var VisuChronoSimple = function() {
	var filtre_evt_text = "";
	var filtrer_evt_blanc = false;
	var events = [];
	
	/* pour supprimer en cas de rechargement de la page 
	   ou de relance du serveur web */
	d3.select("#chrono").select("nav").remove();

	var nav = d3.select("#chrono")
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
				
	this.update = function (){
		//console.log("chronosimple.update:", data.events)
		var evts = [...data.events] // copie les évents ...
		if(!evts){ return; }
		// ...pour pouvoir les trier à l'envers sans changer data.events
		// tri du plus récent au plus ancien
		
		evts.sort((e1, e2) => e2.dt - e1.dt); 

		// Ajoute des événements "de durée" pour caractériser les intervals de temps vides si l'écart entre 2 events > 1 minute
		E = [];
		for(i=0; i < evts.length; i++){
			evt = evts[i];
			evt.duree = 0;
			E.push(evt)
			evtpred = evts[i+1];
			// durée en minute
			duree = evtpred? Math.floor((evt.dt - evtpred.dt)/(60000)) : 0;
			if(duree > 1){
				d = new Date(evt.dt.getTime() - 60000);
				E.push({dt: d, nom: "", duree: duree});
			}
		}
		events = E;
		render_events();
	}
	
	function render_events(){		
		
		ul.selectAll("li")
			.data(events.filter(d => evt_a_afficher(d)), d => d.dt) //la date sert de clef
			.join("li")
				.attr('class', d => d.duree == 0 ? 'evtsimple': 'evtblanc')
				//.classed("dmd", d => d.__class__ == "Dmd")
				.style('padding-bottom', d => d.duree > 0 ? 
											Math.floor(d.duree*pixel_par_min)+"px" : "1px" )
											
				.text(d => d.nom != ""? d.dt.toLocaleTimeString()+": "+d.nom : " ");
	};
	

	function evt_a_afficher(evt){
		if( evt.__class__ != "CR" ){
			return false;
		}
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