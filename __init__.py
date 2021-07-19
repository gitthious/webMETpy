import os.path
from flask import send_from_directory

from . import serveur
from . import jsonify

class webMETpy_flask_extension:
    _static_dir = os.path.realpath(
        os.path.join(os.path.dirname(__file__), 'static'))

    def __init__(self, app):
        self.app = app
        
        # 2 lignes importantes:
        # elles permettent à Flask d'encoder et décoder les objets
        # en json pour les besoins de la simMETpy
        app.json_encoder = jsonify.Encoder
        app.json_decoder = jsonify.Decoder

##        app.add_url_rule('/webMETpy.static/<path:filename>',
##                         'webMETpy.static', self.send_static_file)

    def send_static_file(self, filename):
        """Send a static file from the webMETpy_flask_extension static directory."""
        return send_from_directory(self._static_dir, filename)

def create_webapp(name):
    """
    Crée l'application Flask et la websocket. Retourne les deux.
    """
    import flask.json
    from flask_socketio import SocketIO
    from flask import Flask
    import webMETpy
    
    # enlève le file:/ de l'uri

    app = Flask(name)
    webMETpy.webMETpy_flask_extension(app)
                
    # asyn_mode n'est pas recommandé, je n'ai pas compris pourquoi...
    # cependant, sans lui, point de thread...donc on le garde pour l'instant
    # c'est aussi pour cela que 1) il y a un message qui dit que
    # "...server to ignore eventlet and/or gevent..."
    #
    # autre chose: le serveur ne se lance pas avec l'idle?!?
    # le param 'json' permet d'utiliser le json de Flask et donc celui défini dans l'init.
    socketio = SocketIO(app, async_mode='threading', json=flask.json) 
    
    
    return app, socketio
