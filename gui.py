# coding: utf-8
# © Thierry Hervé

from datetime import datetime, timedelta

from branca.element import MacroElement, Div, Figure
from folium.elements import JSCSSMixin
from jinja2 import Template

class ControlSim(JSCSSMixin, MacroElement):
    # type="button" est important dans une 'form' sinon jquery
    # envoie un submit => ne pas utiliser de 'form'
    _template = Template(u"""

        {% macro html(this, kwargs) %}
            <p class="col-sm-1" id="tick">non connecté</p>
            <button  class="col-sm-1" type="button" id="play_pause">Play</button>
            <button  class="col-sm-1" type="button" id="stop">Stop</button>
            <button  class="col-sm-1" type="button" id="step">Step</button>
            <p  class="col-md-2" id="dateheure">{{this.date_inconnue}}</p>
            <label class="col-sm-1" for="facteur_temps">Accélération</label>
            <input class="col-sm-1" type="number" id="facteur_temps" size="3" value="{{this.time_factor}}">
        {% endmacro %}

        {% macro script(this, kwargs) %}

        function tick_vers_dateheure(tick){
            if( {{this.dateheure_debut|tojson}} ){
                let dh = moment({{this.dateheure_debut|tojson}});
                dh.add(tick, 's');
                return dh.toDate(); 
            } else {
                return null;
            }
        }
        
        var socket;
        var data = null;
        try {
            $( window )
        }
        catch {
            alert("Il faut être connecté à internet!");
        }
        
        $( window ).on( "load", () => {
            console.log("DOM is ready!")
            // DOM is ready! (c'est comme ça qu'on fait en jquery)
            
            socket = io( {{this.namespace|tojson}} );
            socket.on('connected', () => {
                console.log("socket connected")
                $("#tick").html("connecté");
		dh = tick_vers_dateheure(0);
                $("#dateheure").html(dh ? dh.toLocaleString() : '{{this.date_inconnue}}');
            });
            $("#facteur_temps").change(() => {
                v = parseInt($("#facteur_temps").val());
                if(v){
                    socket.emit('change_time_factor', v);
                }
            });
	    $("#play_pause").click(() => {
                console.log("play_pause")
                v = parseInt($("#facteur_temps").val());
                if(v){
                    socket.emit('change_time_factor', v);
                }
                socket.emit('play_pause');
            });
            
	    $("#stop").click(() => {
                console.log("stop")
                socket.emit('stop');
            });
            
	    $("#step").click(() => {
                //console.log("step")
                socket.emit('step');
            });
	
            socket.on('tick', (tick) => {
                //console.log("tick")
		$("#tick").html(tick);
		dh = tick_vers_dateheure(tick);
		$("#dateheure").html(dh ? dh.toLocaleString() : '{{this.date_inconnue}}');
            });

	    socket.on('connect_error', (error) => {
                console.log("socket connect_error")
		$("#tick").html("Non connecté: " + error);
		$("#play_pause").attr('disabled', true)
		$("#step").attr('disabled', true);
		$("#stop").attr('disabled', true);
		dh = tick_vers_dateheure(0);
                $("#dateheure").html(dh ? dh.toLocaleString() : '{{this.date_inconnue}}');
            });
	
            socket.on('sim.factor', (factor) => {
                console.log("sim.factor", factor)
                $("#facteur_temps").attr('value',1/factor);
            });

            socket.on('sim.started', () => {
                console.log("sim.started")
                $("#play_pause").html("Pause");
                $("#play_pause").removeAttr('disabled')
                $("#step").attr('disabled', true);
                $("#stop").removeAttr('disabled');
            });
            
            socket.on('sim.paused', () => {
                console.log("sim.paused")
		$("#play_pause").html("Play");
		$("#play_pause").removeAttr('disabled')
		$("#step").removeAttr('disabled');
		$("#stop").removeAttr('disabled');
            });

            socket.on('sim.resumed', () => {
                console.log("sim.resumed")
		$("#play_pause").html("Pause");
		$("#play_pause").removeAttr('disabled')
		$("#step").attr('disabled', true);
		$("#stop").removeAttr('disabled');
            });

            socket.on('sim.stoped', () => {
                console.log("sim.stoped")
                $("#play_pause").html("Play");
                $("#play_pause").removeAttr('disabled');
                $("#step").attr('disabled', true);
                $("#stop").attr('disabled', true);
                $("#tick").html("connecté");
                dh = tick_vers_dateheure(0);
                $("#dateheure").html(dh ? dh.toLocaleString() : '{{this.date_inconnue}}');
            });

        });

        {% endmacro %}

        """)
    default_js = [
        ('socket.io.js', '/webMETpy/static/socket.io.js'),
##	('d3.min.js', '/webMETpy/static/d3.min.js'),
	('moment-with-locales.js', '/webMETpy/static/moment-with-locales.js'),
##	('initihm.js', '/webMETpy/static/initihm.js'),
##        ('menu.js', '/webMETpy/static/menu.js'),
##	('selecteur.js', '/webMETpy/static/selecteur.js'),
##	('interventions.js', '/webMETpy/static/interventions.js'),
    ]
    date_inconnue = "date inconnue"
    def __init__(self, namespace='/',
                 dateheure_debut=datetime.now(),
                 timespec = 'seconds',
                 time_factor = 1,
                 **kwargs):
        super().__init__(**kwargs)
        self._name = 'cmdsim'
        self.namespace = namespace
        self.dateheure_debut = dateheure_debut.isoformat(timespec=timespec)
        self.time_factor = time_factor

import folium
import folium.plugins

class MapFiring(JSCSSMixin, MacroElement):
    _template = Template(u"""
        {% macro script(this, kwargs) %}
         $( window ).on( "load", () => {
            socket.on('update_map', (update_info) => {
                //console.log("receive change on socket for map", update_info)
                {{this._parent.get_name()}}.eachLayer((layer) => {
                    if( layer._id != update_info.id ) { return; }
                    
                    //console.log("find layer", update_info.id);
                    for(let i=0; i<update_info.fires.length; i++){
                        let fire = update_info.fires[i];
                        layer.fire(fire.name, fire.args);
                    }
                });
            });
         });   
        {% endmacro %}    
""")
    
class Map(folium.Map):
    def __init__(self, serveur, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.serveur = serveur
        
        folium.plugins.MousePosition(position="topright").add_to(self)
        folium.plugins.Geocoder().add_to(self)
    
##        folium.plugins.Draw(export=True).add_to(self)

        folium.plugins.Fullscreen(
            position="topleft",
            title="Expand me",
            title_cancel="Exit me",
            force_separate_button=True,
            
        ).add_to(self)

        # minimized=True KO
        folium.plugins.MiniMap(
            toggle_display=True,
            minimized=True
            ).add_to(self)

        MapFiring().add_to(self)
    
    def update_ui(self, obj, **attrs_vals):
        self.serveur.emit("update_map", attrs_vals)
        
class ContainerFuild(Div):
    _template = Template("""
        {% macro html(this, kwargs) %}
        <div class="container-fluid"
        id="{{this.get_name()}}">{{this.html.render(**kwargs)}}</div>
        {% endmacro %}
        """
    )

class Row(Div):
    _template = Template("""
        {% macro html(this, kwargs) %}
        <div class="row" id="{{this.get_name()}}">{{this.html.render(**kwargs)}}</div>
        {% endmacro %}
        """
    )

class Panel(Div):
    _template = Template("""
        {% macro html(this, kwargs) %}
        <div class="{{this.col}}" id="{{this.get_name()}}">{{this.html.render(**kwargs)}}</div>
        {% endmacro %}
        """
    )
    def __init__(self, col, **kwargs):
        self.col = col
        super().__init__(**kwargs)
    
class PanelChronoSimple(JSCSSMixin, MacroElement):

    _template = Template("""
        {% macro header(this, kwargs) %}
        {% endmacro %}

        {% macro html(this, kwargs) %}
        <div id="chrono"></div>
        {% endmacro %}

        {% macro script(this, kwargs) %}
         $(window).on( "load", () => {
            var visu_chrono = new VisuChronoSimple();
            socket.on('add_event', (evt) => {
                evt.dt = new Date(evt.dt);
                console.log("on.add_event", evt);
                visu_chrono.update(evt);
            })
         });
        {% endmacro %}

    """)
    default_js = [
	('d3.min.js', '/webMETpy/static/d3.min.js'),
	('chronosimple.js', '/webMETpy/static/chronosimple.js'),
    ]
    default_css = [
	('chronosimple.css', '/webMETpy/static/chronosimple.css'),
        ]
    def __init__(self, serveur,
                 dateheure_debut=datetime.now(),
                 **kwargs):
        super().__init__(**kwargs)
        self.serveur = serveur
        self.dateheure_debut = dateheure_debut
        
    def update_ui(self, cr, **attrs_vals):
        evtdt, nom = cr._value
        dt = self.dateheure_debut + timedelta(seconds=evtdt)
        dt = dt.isoformat(timespec='seconds')
        self.serveur.emit("add_event", {'dt': dt, 'nom': nom, 'checkable': True})

class Page(Figure):
    def __init__(self, titre, cont):
        super().__init__(title=titre)
        self.add_child(cont)
        
class Cont(ContainerFuild):
    def __init__(self, *rows):
        super().__init__()
        for row in rows:
            self.add_child(row)

class Ligne(Row):
    def __init__(self, *cols):
        super().__init__()
        for col in cols:
            self.add_child(col)
            
class Col(Panel):
    def __init__(self, dim, panel):
        super().__init__(dim)
        self.add_child(panel)
