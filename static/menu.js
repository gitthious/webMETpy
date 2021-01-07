/*
encoding utf-8
© Thierry hervé
*/

var Menu = function() {
	/* crée un bloc HTML 'ul' sous la balise body
	   pour recevoir les items de menu
	<ul class="menu">
	</ul>
	*/
	
	var menu = d3.select("body").append("ul")
		.attr("class", "menu");
			
	//console.log("Menu", menu);

	function affiche_menu(x, y) {
		var f = d3.select("body").node();
		menu.attr("class", "menu show-menu");
		var h = f.clientHeight, // hauteur
			l = f.clientWidth;  // largeur
		var h2 = h/2, l2 = l/2;
		
		//console.log("affiche_mene", y, x, h, l);
		if(y > h2 && x <= l2) { // cadran gauche/bas
		  menu.style("left", x+"px");
		  menu.style("bottom",(h-y)+"px");
		  menu.style("right", "auto");
		  menu.style("top", "auto");
		} else if(y > h2 && x > l2) { // cadran droit/bas
		  menu.style("right", (l-x)+"px");
		  menu.style("bottom", (h-y)+"px");
		  menu.style("left", "auto");
		  menu.style("top", "auto");
		} else if(y <= h2 && x <= l2) { // cadran gauche/haut
		  menu.style("left", x+"px");
		  menu.style("top", y+"px");
		  menu.style("right", "auto");
		  menu.style("bottom", "auto");
		} else { // y <= h2 && x > l2 cadrant droit / haut
		  menu.style("right", (l-x)+"px");
		  menu.style("top", y+"px");
		  menu.style("left", "auto");
		  menu.style("bottom", "auto");
		}
	}
	
	this.show = function (event, items=["Aucune action définie"]) {
		//console.log(event, items);
		menu.selectAll("li")
			.data(items, d => d)
			.join("li")
				.html(d => d.replaceAll('_', ' ') )
				.on("click", function(d){
					//console.log("click on menu item", this, d);
					//selecteur.selection = d;
					selecteur.action(event, d);
					// si le menu est visible...
					if(menu.attr("class") == "menu show-menu") {
						// ... on l'efface
						menu.attr("class", "menu");
					}
				})
		
		// si le menu est visible...
		if(menu.attr("class") == "menu show-menu") {
			// ... on l'efface
			menu.attr("class", "menu");
		}
		else {
			// sinon on l'affiche à la position du curseur
			affiche_menu(event.pageX, event.pageY);
		}
		event.stopPropagation();
	}
	
	window.onclick = function(event) {
		//console.log("window.onclick", menu, event.target);
		if (event.target !== menu.node() ) { // node retourne l'élt DOM
			if(menu.attr("class") == "menu show-menu") {
				menu.attr("class", "menu");
				selecteur.reinit();
			}
		}
	}
}