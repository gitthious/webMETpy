# encoding utf-8
# © Thierry hervé
 

from simMETpy import sim
import threading
from pathlib import Path

import flask_socketio

class ServiceSim(flask_socketio.Namespace):
    def __init__(self, namespace, socketio, data_init):
        """
        """
        super().__init__(namespace)
        self.socketio = socketio
        self.env = None
        self.data_init = data_init
        self.thread_sim = None

    def trigger_event(self, event, *args):
        """
        Hérité de flask_socketio.Namespace, tente de déclencher
        l'action de l'agent nommée par l'event. Le 1er param
        doit être la clef de l'agent concerné.
        Appel le trigger hérité au cas où l'agent n'existe pas.
        """
##        print("trigger_event", event, *args)
        if not self.env or len( self.env.init._index_agents) == 0:
            # déclenchement hérité
            return super().trigger_event(event, *args)
        # c'est le 2ème params
        agent = None
        if len(args) >= 2 :
            # si pas str alors c'est une autre commande...pas top!
            if isinstance(args[1], str):
                clef_agent = args[1] 
                agent = self.env.init._index_agents.get(clef_agent, None)
        if not agent:
            # déclenchement hérité
            return super().trigger_event(event, *args)

        args = args[2:]
        return self.declencher_action_sim(agent, event, *args)

    def declencher_action_sim(self, agent, nom_action_sim, *args):
        """
        Déclenche un événement pour signaler de déclencher
        l'action de l'agent si la sim n'est pas en pause
        ou arrêtée.
        """
        if not self.env \
        or not self.thread_sim \
        or not self.thread_sim.is_alive() \
        or self.env.paused:
            # ne fait rien si le context n'est pas approprié
            return
        # si un des paramètres est dans l'index, on donne l'objet correspondant
        # si non, juste la valeur.
        # Ce n'est pas complet mais ça doit le faire pour l'instant
        params = [self.env.init._index.get(v,v) for v in args]
##        print(agent, nom_action_sim, params)

        # on déclenche l'événement d'arrivé d'ordre avec la valeur
        # composée du nom de l'action et des paramètres
        agent.arrivee_ordre.succeed((nom_action_sim, params))
        
        
    def on_connect(self):
        self.socketio.emit("connected")
        print("Client connect, envoi des data static")
        if not self.thread_sim or not self.thread_sim.is_alive():
            self.env = sim.Env(strict=False, dispatcher=self.socketio, init=self.data_init)
            print("sim running", False)
            self.socketio.emit("sim.stoped")
            self.socketio.emit('init_data', self.env.init)
            return
        if self.env.paused:
            self.socketio.emit("sim.paused")
        else:
            self.socketio.emit("sim.resumed")
        self.socketio.emit('init_data', self.env.init)
        

    def on_disconnect(self):
        print('Client disconnected')

    def on_play_pause(self):
        if not self.thread_sim or not self.thread_sim.is_alive():
            self.env = sim.Env(strict=False, dispatcher=self.socketio, init=self.data_init)
            self.thread_sim = self.socketio.start_background_task(self.run)
            print("sim running", self.thread_sim, self.thread_sim.is_alive())
            self.socketio.emit("sim.started")
            return
        if self.env.paused:
            print("resume")
            self.env.resume()
            self.socketio.emit("sim.resumed")
        else:
            print("pause")
            self.env.pause()
            self.socketio.emit("sim.paused")


    def on_stop(self):
        print("stop")
        if self.thread_sim and self.thread_sim.is_alive():
            self.env.stop()
            self.thread_sim =  None
            self.data_init.reinit()
            #self.env = None
            self.socketio.emit("sim.stoped")
            self.socketio.emit('init_data', self.data_init)

    def on_step(self):
        print("step")
        if self.thread_sim and self.thread_sim.is_alive() and self.env.paused:
            self.env.next_step()

    def on_change_time_factor(self, time_factor):
        print("change_time_factor")
        self.env.factor = 1/time_factor # bug: dans simpy.rt, factor n'est pas modifiable

    def on_loadsim(self, filename):
        print("loadsim", filename)
        if self.thread_sim: return
        self.env.init.load(filename)
        self.socketio.emit('init_data', self.env.init)
        
    def on_savesim(self, filename):
        print("savesim", filename)
        self.env.init.save(filename)

    def on_geninit(self):
        print("geninit")
        if self.thread_sim: return
        
        self.env.init.gen()
        self.socketio.emit('init_data', self.env.init)
        # howto force rendering template

    def run(self):
        self.env.run()
        print("la simulation s'est arrêtée")

