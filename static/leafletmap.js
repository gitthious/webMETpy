var LeafletMap = function (view, zoom, data) {
	/* 
	data: un objet qui contient des listes d'objets "geojsonables"
	cad qui ont un attribut localisation
	*/
	console.log("LeafletMap", data);
	
	var map = L.map('map').setView(view, zoom)

	// create the OSM tile layer with correct attribution
	var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
	var osmAttrib = 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
	var osm = new L.TileLayer(osmUrl, { 
		minZoom: 5, maxZoom: 22, attribution: osmAttrib,
		zoomDelta: 0.05, zoomSnap: 0.1,
		wheelPxPerZoomLevel: 100	
		})
	map.addLayer(osm);
	L.control.scale().addTo(map);

	var layers_by_feature = new Map();

	function object2geojson(o){
		if(!o){return;}
		if( ! o.hasOwnProperty('localisation') && ! o.hasOwnProperty('clef')) {
			return null;
		}
		let g = {
			type: "Feature",
			geometry: o.localisation
		};
		g.properties = {}; //new Object();
		for (const [k, v] of Object.entries(o)) {
			if(k == "localisation") { continue; }
			g.properties[k] = v;
		}
		return g;
	}

	var geodata = new Map();

	function geosjonify_data(data){
		for(const p in data){
			if( Array.isArray(data[p])){
				for(i=0; i < data[p].length; i++){
					const o = data[p][i];
					go = object2geojson(o);
					if(go){
						geodata[o.clef] = go;
					}
				}
			} else {
				go = object2geojson(data[p]);
				if(go){
					geodata[data[p].clef] = go;
				}
			}
		}
	}

	geosjonify_data(data);
	
	gd = [];
	for(k in geodata){
		//console.log(k, geodata[k]);
		gd.push(geodata[k]);
	}
	/*
	KO! j'y ai passé 3h :(
	geodata.forEach((v, k, map) => {console.log(k,v)});
	geodata.forEach(function(v,k,m){ console.log(k,v)});
	for( [k, v] of geodata){
		console.log(k,v);
	}
	*/

	var geojson_group = L.geoJson(gd, {
			onEachFeature: function (feature, layer) {
				layers_by_feature[feature.properties.clef] = layer;
				//console.log("layer", layer);
				PopUpProperties(feature, layer);
			},
			style: function (feature) {
				//console.log("feature",  );
				// Pour un objet "vide"
				if( feature.properties.__class__ == "Voie"){
					return {weight: 1, color: "black"};
				}
				else if( feature.properties.__class__ == "Navette"){
					return {weight: 2, color: "orange"};
				}
				else if( feature.properties.__class__ == "AgentExploitation"){
					return {weight: 2, color: "black"};
				}
				else if( feature.properties.__class__ == "GroupeVoyageurs"){
					return {weight: 2, color: "blue"};
				}
				else if(Object.keys(feature.properties).length != 0){
					return {weight: 1, color: "red"};
				} else {
					return {weight: 1, color: "#000000"};
				}
			},
			pointToLayer: function (feature, latlang) {
				if( feature.properties.__class__ == "AgentExploitation"){
					return L.circleMarker(latlang, { radius: 5 });
				} 
				else if( feature.properties.__class__ == "GroupeVoyageurs"){
					return L.circleMarker(latlang, { radius: 1 });
				} 
			  }
		}).addTo(map);

	function add_new_layer(feature) {
		geojson_group.addData(feature);
	}

	function update_layer(feature) {
		delete_layer(feature); // Remove the previously created layer.
		add_new_layer(feature); // Replace it by the new data.
	}

	function delete_layer(feature) {
		var l = layers_by_feature[feature.properties.clef];
		geojson_group.removeLayer(l);
	}


	this.update = function (clef, obj) {
		console.log("LeafletMap.update", obj);
		if(!clef || ! obj){ return;}
		
		feature = geodata[clef];
		for(const a in obj) {
			if( a == '__class__') { continue; }
			if( a == "localisation") {
				feature.geometry = obj[a]
			}
			else {
				feature.properties[a] = obj[a];
			}
			update_layer(feature);
		}

	};
}

function PopUpProperties(feature, layer) {
  var popupContent = '<table>'
  if (feature.properties) {
    for (var p in feature.properties) {
      popupContent += '<tr><td>' + p + '</td><td>' + feature.properties[p] + '</td></tr>'
    }
  }
  popupContent += '</table>'
  layer.bindPopup(popupContent)
}

