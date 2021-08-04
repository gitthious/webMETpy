# coding: utf-8
# © Thierry hervé
 

import threading
import flask_socketio


class ServiceSim(flask_socketio.Namespace):
    def __init__(self, namespace, sim_factory, app):
        """
        """
        super().__init__(namespace)
        self.app = app
        self.env = None
        self.sim_factory = sim_factory  # class Env ou callable (factory)
        self.thread_sim = None
        self.factor = 1

    def emit(self, event, data=None):
        super().emit(event, data, namespace=self.namespace)
        
    def on_connect(self):
        self.emit("connected")
        print("Connection d'un client sur %s." % self.namespace)
        if not self.env:
            self.emit("sim.stoped")
            print("sim not running")
        elif self.env.paused:
            self.emit("sim.paused")
            self.emit("sim.factor", self.factor)
            print("sim running, paused")
        else:
            self.emit("sim.resumed")
            self.emit("sim.factor", self.factor)
            print("sim running, resumed")
        
    def on_disconnect(self):
        print("Un client c'est déconnecté")

    def on_play_pause(self):
        if not self.env:
            self.env = self.sim_factory(self)
            self.env.factor = self.factor
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


    def on_stop(self):
        print("stop")
        if not self.env: return
        # mémorise les paramètres précédents de l'environnement
        self.factor = self.env.factor
        self.env.stop()
        self.thread_sim =  None
        self.env = None
        self.emit("sim.stoped")

    def on_step(self):
        print("step")
        if self.env and self.env.paused:
            self.env.step()
        
    def on_change_time_factor(self, time_factor):
        self.factor = 1/time_factor
        print("change_time_factor", 1/time_factor)
        if not self.env: return
        self.env.factor = self.factor

    def tick(self):
        """
        Assure que l'heure sera mis à jour toutes les secondes
        pour un utilisateur humain, quelque soit le facteur d'accélération
        """
        while True:
            yield self.env.timeout(1/self.env.factor) # toute les secondes
            self.emit('tick', self.env.now)

    def run(self):
        self.env.process(self.tick())
        self.env.run()
        print("la simulation s'est arrêtée")



