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

        app.add_url_rule('/webMETpy.static/<path:filename>',
                         'webMETpy.static', self.send_static_file)

    def send_static_file(self, filename):
        """Send a static file from the webMETpy_flask_extension static directory."""
        return send_from_directory(self._static_dir, filename)
