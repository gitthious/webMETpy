# encoding utf-8
# © Thierry hervé
 

from simMETpy import sim, modele
import threading
from pathlib import Path
from datetime import timedelta

import flask_socketio

        
class ServiceSim(flask_socketio.Namespace):
    def __init__(self, namespace, init_data, app):
        """
        """
        super().__init__(namespace)
        self.app = app
        self.init_data = init_data 
        self.env = None
        self.thread_sim = None
        self.declencheurs = {
            sim.UpdateEvt:      self.emit_update,
            sim.CR:             self.emit_CR,
            sim.Dmd:            self.emit_Dmd,
            sim.Tick:           self.emit_tick,
            sim.CRIntervention: self.emit_CRIntervention,
            }
        self.controle_dispatchers()

    def controle_dispatchers(self):
        for evt_type, dispatcheur in self.declencheurs.items():
            if not dispatcheur in evt_type.dispatchers:
                evt_type.dispatchers.append(dispatcheur)
##        for evt_type in self.declencheurs:
##            print(evt_type, evt_type.dispatchers)

    def trigger_event(self, event, *args):
        """
        Hérité de flask_socketio.Namespace, tente de déclencher
        l'action de l'agent nommée par l'event. Le 1er param
        doit être la clef de l'agent concerné.
        Appel le trigger hérité au cas où l'agent n'existe pas.
        """
        #print("trigger_event", event, *args)
        if not self.env or len( self.init_data._index_objets) == 0:
            # déclenchement hérité
            return super().trigger_event(event, *args)
        # c'est le 2ème params
        agent = None
        if len(args) >= 2 :
            # si pas str alors c'est une autre commande...pas top!
            if isinstance(args[1], str):
                clef_agent = args[1] 
                agent = self.init_data._index_objets.get(clef_agent, None)
        #print("trigger_event, agent sim", agent)
        if not agent:
            # déclenchement hérité
            return super().trigger_event(event, *args)

        args = args[2:]
        return self.declencher_action_sim(agent, event, *args)

    def emit(self, event, data=None):
        super().emit(event, data, namespace=self.namespace)

    def emit_init_data(self):
        self.emit('init_data', self.init_data)

    def emit_update(self, update_evt):
        import json
        obj, attrs = update_evt.value
        attrs = list(attrs)
        d = self.app.json_encoder().default(obj)
        ## supprime les attrs qui ne sont pas retenus
        if len(attrs) != 0:
            attrs.append('__class__')
            for a in [k for k in d.keys() if k not in attrs]:
                del d[a]
        self.emit('update', {'obj': d, 'clef': obj.clef})

    def emit_CR(self, cr_event, CRcls=modele.CR):
        simtime, info = cr_event.value
        dt = self.init_data.dateheure_debut+timedelta(seconds=simtime)
        newcr = None
        for cr in self.init_data.events:
            if isinstance(cr, modele.CRIntervention): continue
            if (dt, info) == (cr.dt,cr.nom):
                newcr = cr
                break
        if not newcr:    
            newcr = CRcls(dt,info)
            self.init_data.events.append(newcr)
            self.emit('EVT', newcr)            

        
    def emit_CRIntervention(self, cr_intervention, CRcls=modele.CRIntervention):
        simtime, agent, intervention, args, encours = cr_intervention.value
        dt = self.init_data.dateheure_debut+timedelta(seconds=simtime)
        agent = agent.nom
        intervention = intervention.__name__
        newcr = None
        for cr in self.init_data.events:
            if not isinstance(cr, modele.CRIntervention): continue
            if (dt, agent, intervention, args, encours) == (cr.dt, cr.agent, cr.intervention, cr.args, cr.encours):
                newcr = cr
                break
        if not newcr:    
            newcr = CRcls(dt, agent, intervention, args, encours)
            self.init_data.events.append(newcr)
            self.emit('EVT', newcr)            

    def emit_Dmd(self, dmd_event):
        self.emit_CRIntervention(dmd_event, CRcls=modele.Dmd)

    def emit_tick(self, cr_tick):
        self.emit('tick', cr_tick.value)

    def declencher_action_sim(self, agent, nom_action_sim, *args):
        """
        Déclenche un événement pour assurer le lancement d'une
        action de l'agent si la sim n'est pas en pause
        ou arrêtée.
        """
        if not self.env \
        or not self.thread_sim \
        or not self.thread_sim.is_alive() \
        or self.env.paused:
            # ne fait rien si le context n'est pas approprié
            return
        self._declencher_action_sim(agent, nom_action_sim, *args)
        
    def _declencher_action_sim(self, agent, nom_action_sim, *args):
        # si un des paramètres est dans l'index, on donne l'objet correspondant
        # si non, juste la valeur.
        # Ce n'est pas complet mais ça doit le faire pour l'instant
        params = [self.init_data._index_objets.get(v,v) for v in args]

        # on déclenche l'événement d'arrivé d'ordre avec la valeur
        # composée du nom de l'action et des paramètres
        agent._arrivee_ordre.succeed((nom_action_sim, params))
        
    def on_connect(self):
        self.emit("connected")
        print("Client connect (%s), envoi des data static" % self.namespace)
        if not self.thread_sim or not self.thread_sim.is_alive():
            if not self.env:
                self.env = sim.Env()
            self.emit("sim.stoped")
            print("sim not running")
        elif self.env.paused:
            self.emit("sim.paused")
            print("sim running, paused")
        else:
            self.emit("sim.resumed")
            print("sim running, resumed")
        self.emit("sim.factor", self.env.factor)
        self.emit_init_data()
        

    def on_disconnect(self):
        print('Client disconnected')

    def on_play_pause(self):
        if not self.thread_sim or not self.thread_sim.is_alive():
            if hasattr(self, "factor"): # on fait un play après un stop
                self.env.factor = self.factor
            self.init_data.setup(self.env)
            self.thread_sim = self.socketio.start_background_task(self.run)
            print("sim running", self.thread_sim, self.thread_sim.is_alive())
            self.emit("sim.started")
        elif self.env.paused:
            print("resume")
            self.env.resume()
            self.emit("sim.resumed")
        else:
            print("pause")
            self.env.pause()
            self.emit("sim.paused")
        print("emit sim.factor", self.env.factor)
        self.emit("sim.factor", self.env.factor)


    def on_stop(self):
        print("stop")
        if self.thread_sim and self.thread_sim.is_alive():
            # mémorise les paramètres précédents de l'environnement
            self.factor = self.env.factor
            self.env.stop()
            self.thread_sim =  None
            self.emit("sim.stoped")

    def on_step(self):
        print("step")
        if self.thread_sim and self.thread_sim.is_alive() and self.env.paused:
            self.env.next_step()

    def on_gen(self):
        if self.thread_sim and self.thread_sim.is_alive(): return
        print("gen")
        self.env = sim.Env()
        self.init_data.gen(self.env)
        self.emit_init_data()
        
    def on_change_time_factor(self, time_factor):
        print("change_time_factor", 1/time_factor)
        self.env.factor = 1/time_factor

    def on_loadsim(self, filename):
        print("loadsim", filename)
        if self.thread_sim: return
        self.data_init.load(filename)
        self.emit_init_data()
        
    def on_savesim(self, filename):
        print("savesim", filename)
        self.data_init.save(filename)

    def run(self):
        self.charger_interventions_pre_enregistrees()
        self.env.run()
        print("la simulation s'est arrêtée")

    def charger_interventions_pre_enregistrees(self,
                                nom_fichier="./interventions_prévues.json"):
        import json
        I = []
        try:
            with open(nom_fichier) as f:
                I = json.load(f)
        except FileNotFoundError:
            print("Pas d'intervention pré-enregistrée")

        def go(event):
            agent, nom, args = event._value
            self._declencher_action_sim(agent, nom, *args)

        import simpy.events
        class InterventionEvent(simpy.events.Event):
           def __init__(self, env: 'Environment', tick, agent, nom_intervention, args ):
              super().__init__(env)
              self.callbacks: EventCallbacks = [go]
              self._value = (agent, nom_intervention, args)
              self._delay = tick
              self._ok = True
              self.env.schedule(self, delay=tick)
              
        for tick, nom_agent, nom_intervention, params in I:

            try:
                agent = self.init_data._index_objets[nom_agent]
            except KeyError:
                print(nom_agent, "n'existe pas")
                continue
            
            InterventionEvent(self.env, tick, agent, nom_intervention, params)
            
