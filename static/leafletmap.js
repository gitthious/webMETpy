var LeafletMap = function (view, zoom, data) {
	/* 
	data: un objet qui contient des listes d'objets "geojsonables"
	cad qui ont un attribut localisation
	*/
	//console.log("LeafletMap", data);
	
	// Pour avoir un tileLayer vide au départ!
	// cf. https://stackoverflow.com/questions/28094649/add-option-for-blank-tilelayer-in-leaflet-layergroup
	var base = {
	  'Empty': L.tileLayer(''),
	  'OSM': L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		'attribution': 'Map data &copy; OpenStreetMap contributors', 
		minZoom: 5, maxZoom: 22, 
		zoomDelta: 0.05, zoomSnap: 0.1,
		wheelPxPerZoomLevel: 100
	  })
	};

	var map = L.map('map', {
	  'center': view,
	  'zoom': zoom,
	  'layers': [
		base.Empty
	  ]
	});

	var control = L.control.layers(base).addTo(map);


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
				PopUpProperties(feature, layer);
			},
			style: function (feature) {
				return {'className': feature.properties.__class__};
			},
			pointToLayer: function (feature, latlang) {
				var m = L.circleMarker(latlang, { radius: 5 });
				m.on('mouseover', () => { m.setRadius(10)});
				m.on('mouseout', () => { m.setRadius(5)});
				return m;
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

