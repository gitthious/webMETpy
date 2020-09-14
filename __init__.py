import os.path
from flask import send_from_directory

from . import serveur

class webMETpy_flask_extension:
    _static_dir = os.path.realpath(
        os.path.join(os.path.dirname(__file__), 'static'))

    def __init__(self, app):
        self.app = app

        app.add_url_rule('/webMETpy.static/<path:filename>',
                         'webMETpy.static', self.send_static_file)

    def send_static_file(self, filename):
        """Send a static file from the webMETpy_flask_extension static directory."""
        return send_from_directory(self._static_dir, filename)
