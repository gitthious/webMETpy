/*
encoding utf-8
© Thierry hervé
*/

var Selecteur = function(vues){
	var types_selectionnables = [];
	var selection = null;
	var winfo = d3.select("#info_select");
	var waction = d3.select("#action_select");
	this.vues = vues;
	
	var sujet = null, 
	    mission = null, 
		parametres = [];
	
	this.est_un_type_selectionnable = function (type) {
		return types_selectionnables.indexOf(type) != -1;
	};
	
	this.affiche_infos_selectionnables = function(infos){
		msg = "A sélectionner: "+infos.join(", ");
		winfo.html(msg);
	};
	
	this.action_select = function(obj){
		if(!obj){
			waction.html("");
			waction.select("button").remove();
			return;
		}
		
		//console.log(obj);
		var txt = obj.toString().replaceAll('_', ' '); 
		waction.html(waction.html()+txt+' ');

		// Il faut que le bouton soit placé après le text pour prendre en compte le click!?!
		var btCancel = waction.select("button[name=cancel]")
		if( ! btCancel.empty()){
			btCancel.remove()
		}
		btCancel = waction.append("button").text("Annuler").attr("name", "cancel");
		btCancel.on("click", function() {
			selecteur.stop_action(event);
			waction.html("");
			waction.select("button").remove();
			
		});
	};
	
	this.afficher_bouton_go = function(event){
		/* 
		Si les boutons sont déjà affichés
		on ne les affiche pas de nouveau
		On fait ça pour le traitement des params optionnels
		*/
		
		var btOK = waction.select("button[name=OK]")
		if( btOK.empty()){
			btOK =  waction.append("button").text("OK").attr("name", "OK");
		}
		
		// Il faut réactiver les événements, je ne sais pas pourquoi mais bon!
		btOK.on("click", function() {
			selecteur.action(event);
		});
	}
	
	function* enchainement_actions() {

		if(!data.comportements) { return [[], null]; }
		var a_selectionner, action;		

		// 1ère étape: retourne les types d'agents à sélectionner
		// Ils sont définis pour chaque profil (cf. template html)
		// alors qu'avant ils l'étaient par les data.comportements
		a_selectionner = []
		if(types_agents_selectionnables)
		{
			for(var i=0; i < types_agents_selectionnables.length; i++){
				a_selectionner.push(types_agents_selectionnables[i])
			}
		}
		/*
		if(data.comportements)
		{
			for(var i=0; i < data.comportements.length; i++){
				a_selectionner.push(data.comportements[i].type_agent)
			}
		}
		*/

		//console.log("enchainement_actions: à selectionner", a_selectionner);
		yield [a_selectionner, null];
		sujet = selection.clef
		selecteur.action_select();
		selecteur.action_select(sujet);

		// 2ème étape: retourne les comportements à sélectionner dans un menu
		// Ils l'étaient à partir du type de la selection (sujet)
		// Il faut aller les chercher dans la selection elle même
		
		items = []; var tp;
		var ODC = [
			"Confirmation_fermeture_portes", 
			"Autorisation_acces_plateforme", 
			"Autorisation_acces_PEQ", 
			"Station_vers_ou_evacuer", 
			"KSA_acces_navette",
			"Autorisation_depreparation"
		]
		for(var i=0; i < data.comportements.length; i++){
			tp = data.comportements[i]
			if(tp.type_agent != selection.__class__) continue;
			for(var j=0; j <tp.comportements.length; j++){
				var nom = tp.comportements[j].nom
				// On ne récupère que les ordres de conduite 
				// Pour l'instant car on n'a pas la liste de ceux
				// effectivement attendus
				var nom_odc = false;
				for(var n=0; n<ODC.length; n++){
					if(nom == ODC[n]){
						nom_odc = true;
						break;
					}
				}
				if(nom_odc){
					if(selection.intervention_en_cours && selection.attente_ordre_de_conduite){
						items.push(nom);
					}
				} else {
					if(!selection.intervention_en_cours){
						items.push(nom);
					}
				}
			}
			break;
		}
		
		//console.log("enchainement_actions: à selectionner", items);
		if(items.length == 0){
			selecteur.stop_action();
		}else{
			yield [[], menu.show, items];
		}
		
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
		
		//console.log("enchainement_actions: selection", comportement, params);
		for(var p=0; p < comportement.params.length; p++){
			var a_selectionner = [];
			a_selectionner.push(comportement.params[p].type);
			//console.log("enchainement_actions: à selectionner", a_selectionner);
			if(comportement.params[p].default === null){
				yield [a_selectionner, selecteur.afficher_bouton_go];
			}
			else {
				yield [a_selectionner, null];
			}

			
			if(selection === undefined){
				// on était dans un cas de go avant la fin des params
				return [[], selecteur.go]
			}
			// pour le cas des types à saisir (à revoir)
			val = selection.clef?selection.clef:selection
			selecteur.action_select(val);
			parametres.push(val)
		}

		
		//console.log("enchainement_actions: à selectionner", comportement, parametres);
		yield [[], selecteur.afficher_bouton_go]
		return [[], selecteur.go]
	}
	
	this.reinit = function(){
		selection = null;
		sequence_actions = enchainement_actions();
		[types_selectionnables, action, params] = sequence_actions.next().value;
		this.affiche_infos_selectionnables(types_selectionnables);
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
		this.affiche_infos_selectionnables(types_selectionnables);
		if(types_selectionnables[0] == "int"){
			waction.append('input')
				.attr("placeholder", "durée en minute")
				.on("change", function(d) {
					//console.log("onchange", this)
					d = this.value
					d3.select(this).remove();
					selecteur.action(event, parseInt(d));
				});
		} else {
			if(action){
				action(event, params);
			}
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
	

	this.on = function( type_selectionnable, nom_vue){
		
		function call(d3selection){
			d3selection
				.on("mouseenter", function(d){
					// this est l'élément DOM 
					if(selecteur.est_un_type_selectionnable(type_selectionnable)){
						this.classList.add('mousein');
						//console.log('mouseenter', this);
						let vues = selecteur.vues;
						for(v=0; v < vues.length; v++){
							if(vues[v].name == nom_vue) { continue; }
							d3.select('#'+vues[v].name).selectAll('.'+type_selectionnable).filter(
								function(x) { return x.clef == d.clef })
								.each(function(x){ 
									this.classList.add('mousein'); 
									//console.log('mouseenter', this);
									});
						}
					}
				})
				.on("mouseleave", function(d){
					if(selecteur.est_un_type_selectionnable(type_selectionnable)){
						this.classList.remove('mousein');
						let vues = selecteur.vues;
						for(v=0; v < vues.length; v++){
							if(vues[v].name == nom_vue) { continue; }
							d3.select('#'+vues[v].name).selectAll('.'+type_selectionnable).filter(
								function(x) { return x.clef == d.clef })
								.each(function(x){ this.classList.remove('mousein')});
						}
					}
				})
				.on("click", function(d) {
					// Pour éviter qu'il y est encore des event handler de click
					// On ne peut cliquer que sur les types sélectionnables
					if( selecteur.est_un_type_selectionnable(d.__class__ )){
						selecteur.action(event, d);
					}
					this.classList.remove('mousein');
					let vues = selecteur.vues;
					for(v=0; v < vues.length; v++){
						if(vues[v].name == nom_vue) { continue; }
						d3.select('#'+vues[v].name).selectAll('.'+type_selectionnable).filter(
							function(x) { return x.clef == d.clef })
							.each(function(x){ this.classList.remove('mousein')});
					}
				});
		}
		
		return call
	}
}

