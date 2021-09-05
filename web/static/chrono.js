/*
encoding utf-8
© Thierry hervé
*/

var VisuChrono = function(temps_initial, plage_horaire) {
	/* pour supprimer le svg en cas de rechargement de la page 
	   ou de relance du serveur web
	*/
	
	d3.select("#chrono").select("svg").remove();

	/*
		Bon article pour comprendre comment gérer la taille des SVG:
		https://css-tricks.com/scale-svg/
	*/
	var svg = d3.select("#chrono").append("svg")
		.attr('viewBox', "0 0 500 400")
		.attr('preserveAspectRatio', "xMidYMid meet")
		.attr('height', 'auto');
		// C'est soit width ou height mais pas les deux
		//.attr('width', 'auto');

	const ESP = 30 // espacement en pixel entre l'axe et les événements

	var margin = {top: 20, right: 20, bottom: 20, left: 150},
		width = 500 - margin.left - margin.right,
		height = 400 - margin.top - margin.bottom,
		margin2 = {top: 20, right: 20, bottom: 20, left: 50},
		width2 = 500 - width - margin2.left - margin2.right -70;
	
	var temps_courant = moment(temps_initial).toDate();
	
	var parseDate = d3.timeParse("%b %Y");

	var y = d3.scaleTime().range([0, height]),
		y2 = d3.scaleTime().range([0, height]);
		
	var x = d3.scaleLinear().range([0, width]),
		x2 = d3.scaleLinear().range([0, width2]);

	var xAxis = d3.axisLeft(x);


	var yAxis = d3.axisLeft(y).tickFormat(multiFormat),
		yAxis2 = d3.axisLeft(y2).tickFormat(multiFormat);

	var ligne_de_temps_courant = d3.line(),
		ligne_de_temps_courant2 = d3.line();

	var brush = d3.brushY()
		.extent([[0, 0], [width2, height]])
		.on("brush end", brushed);

	var zoom = d3.zoom()
		.scaleExtent([1, Infinity])
		.translateExtent([[0, 0], [width, height]])
		.extent([[0, 0], [width, height]])
		.on("zoom", zoomed);

	svg.append("defs").append("clipPath")
		.attr("id", "clip")
		.append("rect")
		.attr("width", width)
		.attr("height", height);

	var focus = svg.append("g")
		.attr("class", "focus")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var context = svg.append("g")
		.attr("class", "context")
		.attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

	// x heures autour de l'heure courante (plage horaire)
	y.domain([
		temps_courant, 
		moment(temps_courant).add(2 , 'hours') // + 2 heures
	]);
	y2.domain([
		temps_courant, 
		moment(temps_courant).add(plage_horaire , 'hours')
	]);

	x.domain([0, width]);
	x2.domain(x.domain());


	ligne_de_temps_courant
		.x(d => x(d.pos))
		.y(d => y(d.dt) );

	ligne_de_temps_courant2
		.x(d => x2(d.pos))
		.y(d => y2(d.dt) )



	focus.append("g")
	  .attr("class", "axis axis--y")
	  .call(yAxis);

	context.append("g")
	  .attr("class", "axis axis--y")
	  .call(yAxis2);

	context.append("g")
	  .attr("class", "brush")
	  .call(brush)
	  .call(brush.move, y.range());

	svg.append("rect")
	  .attr("class", "zoom")
	  .attr("width", width)
	  .attr("height", height)
	  .call(zoom);
	  
	  
	this.update = function (evts){
		
		if(evts){
			focus.selectAll(".evt")
				.data(evts, d => d)
				.join(enter => {
					const g = enter.append('g')
						.attr('class', 'evt');
					g.append("text")
						.text(d => d.nom)
						.attr('x', x(ESP)+10)
						.attr('y', d => y(d.dt));
					g.append("line")
						.attr("x1", 2).attr("y1", d => y(d.dt))
						.attr("x2", x(ESP)).attr("y2",d => y(d.dt));
					g.append("circle")
						.attr('cx', x(ESP)).attr('cy', d => y(d.dt))
						.attr('r',x(5));
				});
			
			context.selectAll(".evt")
				.data(evts, d => d)
				.join(enter => {
					const g = enter.append('g')
						.attr('class', 'evt');
					g.append("line")
						.attr("x1", 2).attr("y1", d => y2(d.dt))
						.attr("x2", width2).attr("y2",d => y2(d.dt));
					});
		}
		this.update_temps_courant(temps_courant);
	}

	this.update_temps_courant = function(temps_courant){ // date js

		focus.selectAll(".temps_courant")
			.data([[{dt: temps_courant, pos:0}, {dt: temps_courant, pos:width}]])
			.join("path")
				.classed("temps_courant", true)
				.attr("d", ligne_de_temps_courant ); 

		context.selectAll(".temps_courant")
			.data([[{dt: temps_courant, pos:0}, {dt: temps_courant, pos:width2}]])
			.join("path")
				.classed("temps_courant", true)
				.attr("d", ligne_de_temps_courant2 );
	};
	
	function brushed() {
	  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
	  var s = d3.event.selection || y2.range();
	  y.domain(s.map(y2.invert, y2));
	  focus.selectAll(".evt").selectAll("[y]").attr("y", d => y(d.dt));
	  focus.selectAll(".evt").selectAll("[y1]").attr("y1", d => y(d.dt));
	  focus.selectAll(".evt").selectAll("[y2]").attr("y2", d => y(d.dt));
	  focus.selectAll(".evt").selectAll("[cy]").attr("cy", d => y(d.dt));
	  focus.select(".temps_courant").attr("d", ligne_de_temps_courant);
	  focus.select(".axis--y").call(yAxis);
	  context.selectAll(".evt").selectAll("[y1]").attr("y1", d => y2(d.dt));
	  context.selectAll(".evt").selectAll("[y2]").attr("y2", d => y2(d.dt));
	  svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
		  .scale(height / (s[1] - s[0]))
		  .translate(0, -s[0]));
	}

	function zoomed() {
	  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
	  var t = d3.event.transform;
	  y.domain(t.rescaleY(y2).domain());
	  focus.selectAll(".evt").selectAll("[y]").attr("y", d => y(d.dt));
	  focus.selectAll(".evt").selectAll("[y1]").attr("y1", d => y(d.dt));
	  focus.selectAll(".evt").selectAll("[y2]").attr("y2", d => y(d.dt));
	  focus.selectAll(".evt").selectAll("[cy]").attr("cy", d => y(d.dt));
	  focus.select(".temps_courant").attr("d", ligne_de_temps_courant);
	  focus.select(".axis--y").call(yAxis);
	  context.selectAll(".evt").selectAll("[y1]").attr("y1", d => y2(d.dt));
	  context.selectAll(".evt").selectAll("[y2]").attr("y2", d => y2(d.dt));
	  context.select(".brush").call(brush.move, y.range().map(t.invertY, t));
	}


};

