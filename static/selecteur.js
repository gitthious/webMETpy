/*
encoding utf-8
© Thierry hervé
*/

var Selecteur = function(){
	var types_selectionnables = [];
	var selection = null;
	var winfo = d3.select("#info_select");
	var waction = d3.select("#action_select");
	
	var sujet = null, 
	    mission = null, 
		parametres = [];
	
	this.est_un_type_selectionnable = function (type) {
		return types_selectionnables.indexOf(type) != -1;
	};
	
	this.info_select = function(obj){
		var txt = JSON.stringify(obj);
		winfo.html(txt);
	};
	
	this.action_select = function(obj){
		//console.log("selecteur.action_select", obj)
		if(!obj){
			waction.html("");
			waction.select("button").remove();
			return;
		}
		var txt = obj; 
		waction.html(waction.html()+txt+' ');
	};
	
	this.afficher_bouton_go = function(event){
		waction.append("button")
			.text("Go")
			.on("click", function() {
				selecteur.action(event);
			});
		waction.append("button")
			.text("Cancel")
			.on("click", function() {
				selecteur.stop_action(event);
				waction.html("");
				waction.select("button")
					.remove();
			});
	}
	
	function* enchainement_actions() {

		if(!data.comportements_ihm) { return; }
		var a_selectionner, action;		

		// 1ère étape: retourne les types d'agents à sélectionner
		a_selectionner = []
		if(data.comportements_ihm)
		{
			for(var i=0; i < data.comportements_ihm.length; i++){
				a_selectionner.push(data.comportements_ihm[i].type_agent)
			}
		}
		//console.log("enchainement_actions: à selectionner", a_selectionner);
		yield [a_selectionner, null];
		sujet = selection.clef
		selecteur.action_select();
		selecteur.action_select(sujet);

		// 2ème étape: retourne les comportements à sélectionner dans un menu
		items = []; var tp;
		for(var i=0; i < data.comportements_ihm.length; i++){
			if(data.comportements_ihm[i].type_agent != selection.__class__) continue;
			tp = data.comportements_ihm[i]
			for(var j=0; j <data.comportements_ihm[i].comportements.length; j++){
				items.push(data.comportements_ihm[i].comportements[j].nom);
			}
			break;
		}
		
		//console.log("enchainement_actions: à selectionner", items);
		yield [[], menu.show, items];
		
		mission = selection;
		selecteur.action_select(mission);
		
		
		// 3ème étape: retourne un type d'agent à sélectionner pour chaque param
		// va proposer une sélection pour chaque paramètre du comportement
		// choisi
		var comportement;
		for(var j=0; j <tp.comportements.length; j++){
			if( tp.comportements[j].nom == mission){
				comportement = tp.comportements[j];
				break;
			}
		}
		
		//console.log("enchainement_actions: selection", comportement);
		for(var p=0; p < comportement.params.length; p++){
			var a_selectionner = [];
			a_selectionner.push(comportement.params[p]);
			//console.log("enchainement_actions: à selectionner", a_selectionner);
			yield [a_selectionner, null];
			
			selecteur.action_select(selection.clef);
			parametres.push(selection.clef)
		}

		
		//console.log("enchainement_actions: à selectionner", "go/cancel");
		yield [[], selecteur.afficher_bouton_go]
		return [[], selecteur.go]
	}
	
	this.reinit = function(){
		selection = null;
		sequence_actions = enchainement_actions();
		[types_selectionnables, action, params] = sequence_actions.next().value;
		this.info_select(types_selectionnables);
		sujet = null;
	    mission = null; 
		parametres = [];
		waction.selectAll("button").remove();
		waction.html('')
	};
	
	this.reinit();
	
	this.action = function (event, objet_selectionne){
		selection = objet_selectionne
		var r = sequence_actions.next();
		//console.log("Selecteur.action", selection, r.value);
		[types_selectionnables, action, params] = r.value;
		this.info_select(types_selectionnables);
		if(action){
			action(event, params);
		}
		if(r.done) {
			selecteur.reinit();
		}
	}
	
	this.stop_action = function(event){
		selecteur.reinit();
	}

	this.go = function(event){
		//console.log("go", mission, sujet, parametres);
		socket.emit(mission, sujet, ...parametres);
	}

}