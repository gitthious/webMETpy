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

class Setter_vues_objets:
    def __init__(self):
        """
        Chaque vue devra avoir une interface update_ui(self, **attrs_vals).
        """
        self.vues_attrs_par_objet = {}
        
    def controle(self, vue, objets, attrs):
        for o in objets:
            self.vues_attrs_par_objet.setdefault(o, []).append((vue, attrs))
            self._instrument_type(type(o))

    def _instrument_type(self, cls):
        if hasattr(cls, "original_setattr"): return
        cls.original_setattr = cls.__setattr__
            
        def setattr_wrapper(obj, attr, val):
                                
            oldval = getattr(obj, attr, None)
            if val == oldval: return

            cls.original_setattr(obj, attr, val)
            self.notifie_vues(obj, attr, oldval, val)

        cls.__setattr__ = setattr_wrapper

    def notifie_vues(self, obj, attr, oldval, val):
        for vue, attrs in self.vues_attrs_par_objet[obj]:
            if attr not in attrs: continue
            vue.update_ui(obj, **{attr: val})
        
      

if __name__ == '__main__':
    class X:
        def __init__(self, a, b):
            self.a = a
            self.b = b

    class V1:
        def update_ui(self, obj, **kwargs):
            print('V1.update_ui', obj, kwargs)

    class V2:
        def update_ui(self, obj, **kwargs):
            print('V2.update_ui', obj, kwargs)

    x1 = X(1, 1)
    x2 = X(2, 2)
    x3 = X(3, 3)

    S = Setter_vues_objets()
    S.controle(V1(), (x1, x2, x3), ('a'))
    S.controle(V2(), (x1, x2), ('a', 'b'))

    x1.a = 11
    x2.a = 12
    x3.a = 13

    x1.b = 21
    x2.b = 22
    x3.b = 23
    
