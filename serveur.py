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

import itertools
from .jsonify import getattrval

class ViewObjectController:
    def __init__(self, serveur, controled_objects):
        """
        Pour chaque type d'objet, associe une ou plusieurs vues et pour
        chacune une liste d'attributs à transmettre.
        cad un dict d'objets { o:  (v1, v2, ...) }
        """
        self.serveur = serveur
        
        for o in controled_objects:
            # tous les attributs publiques
            attrs = [a for a,v in getattrval(o)]
            if len(attrs) == 0:
                print("Attention: aucun attribut de '%s' à controler" % repr(o))
            UpdateNotificationGenerator(type(o), self.notify_update_view, attrs)

    def notify_update_view(self, obj, attr, old, val):
        self.update_ui(**{ attr: val })

    def update_ui(self, **attrs_vals):
        raise NotImplementedError()
                
class CreateNotificationGenerator:
    """
    """
    def __init__(self, cls, notify_func):

        # cls est déjà instrumentée
        if hasattr(self, 'original_init'): return
        self.original_init = cls.__init__
        self.cls = cls
        
        def init_wrapper(*args, **kargs):
            self.original_init(*args, **kargs)
            notify_func(*args, **kargs)

        self.cls.__init__ = init_wrapper

    def detach(self):
        self.cls.__init__ = self.original_init

    def __del__(self):
        self.detach()

class UpdateNotificationGenerator:
    """
    """
    def __init__(self, cls, notify_func, attrs):

        # cls est déjà instrumentée
        if hasattr(self, 'original_setattr'): return
        self.original_setattr = cls.__setattr__
        self.cls =  cls
        
        def setattr_wrapper(obj, attr, val):
                
            if attr not in attrs:
                self.original_setattr(obj, attr, val)
                return
                
            oldval = getattr(obj, attr, None)
            if val == oldval: return

            self.original_setattr(obj, attr, val)
            notify_func(obj, attr, oldval, val)

        self.cls.__setattr__ = setattr_wrapper

    def detach(self):
        self.cls.__setattr__ = self.original_setattr

    def __del__(self):
        self.detach()
