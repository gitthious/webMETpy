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

	this.show = function (event, items=["Aucune action définie"]) {
		//console.log(event, items);
		menu.selectAll("li")
			.data(items, d => d)
			.join("li")
				.html(d => d.replace('O_','').replace('ODC_','').replaceAll('_', ' ') )
				.on("click", function(d){
					//console.log("click on menu item", this, d);
					//selecteur.selection = d;
					selecteur.action(event, d);
					if(menu.attr("class") == "menu show-menu") {
						menu.attr("class", "menu");
					}
				})
		
		if(menu.attr("class") == "menu show-menu") {
			menu.attr("class", "menu");
		}
		else {
			menu.attr("class", "menu show-menu");
			menu.style("left", event.pageX+"px");
			menu.style("top", event.pageY+"px");
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