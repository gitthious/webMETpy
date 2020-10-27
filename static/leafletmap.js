var LeafletMap = function (view, zoom, data) {

  // Create Leaflet map and Agent layers
  var Lmap = L.map('map').setView(view, zoom)
  var AgentLayer = L.geoJSON().addTo(Lmap)

  // create the OSM tile layer with correct attribution
  var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  var osmAttrib = 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
  var osm = new L.TileLayer(osmUrl, { 
		minZoom: 5, maxZoom: 22, attribution: osmAttrib,
		zoomDelta: 0.05, zoomSnap: 0.1,
		wheelPxPerZoomLevel: 100	
		})
  Lmap.addLayer(osm);
  L.control.scale().addTo(Lmap);

  this.update = function () {
	console.log("LeafletMap.update", data);
	if(!data) { return; }
    AgentLayer.remove()
	var geodata = [];
	geodata.push(object2geojson(data.voie1));
	geodata.push(object2geojson(data.voie2));


	for(s=0; s<data.stations.length; s++){
		geodata.push(object2geojson(data.stations[s]));
	}
	
	for(s=0; s<data.navettes.length; s++){
		geodata.push(object2geojson(data.navettes[s]));
	}

	for(s=0; s<data.agents_exploitation.length; s++){
		geodata.push(object2geojson(data.agents_exploitation[s]));
	}

	for(s=0; s<data.groupes_voyageurs.length; s++){
		geodata.push(object2geojson(data.groupes_voyageurs[s]));
	}

	console.log("LeafletMap.geodata", geodata);
	
    AgentLayer = L.geoJSON(geodata, {
		onEachFeature: PopUpProperties,
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
    }).addTo(Lmap)
  }

  this.reset = function () {
    AgentLayer.remove()
  }
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

function object2geojson(o){
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