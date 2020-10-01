# encoding utf-8
# © Thierry hervé
 

from simMETpy import sim
import threading
from pathlib import Path

import flask_socketio

class ServiceSim(flask_socketio.Namespace):
    def __init__(self, namespace, socketio, data_init):
        super().__init__(namespace)
        self.socketio = socketio
        self.env = None
        self.data_init = data_init
        self.thread_sim = None
        
    def on_connect(self):
        self.socketio.emit("connected")
        print("Client connect, envoi des data static")
        if not self.thread_sim or not self.thread_sim.is_alive():
            self.env = sim.Env(strict=False, dispatcher=self.socketio, init=self.data_init)
            print("sim running", False)
            self.socketio.emit("sim.stoped")
            self.socketio.emit('init_data', self.env.init.init_data())
            return
        if self.env.paused:
            self.socketio.emit("sim.paused")
        else:
            self.socketio.emit("sim.resumed")
        self.socketio.emit('init_data', self.env.init.init_data())
        

    def on_disconnect(self):
        print('Client disconnected')

    def on_play_pause(self):
        if not self.thread_sim or not self.thread_sim.is_alive():
            self.env = sim.Env(strict=False, dispatcher=self.socketio, init=self.data_init)
            self.thread_sim = self.socketio.start_background_task(self.run, self.env)
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
            self.env = None
            self.socketio.emit("sim.stoped")
            self.socketio.emit('init_data', self.data_init.init_data())

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
        self.socketio.emit('init_data', self.env.init.init_data())
        
    def on_savesim(self, filename):
        print("savesim", filename)
        self.env.init.save(filename)

    def on_geninit(self):
        print("geninit")
        if self.thread_sim: return
        
        self.env.init.gen()
        self.socketio.emit('init_data', self.env.init.init_data())
        # howto force rendering template

