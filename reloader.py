import os.path, sys

from werkzeug._compat import iteritems

def _find_common_roots(paths):
    """Out of some paths it finds the common roots that need monitoring."""
    paths = [x.split(os.path.sep) for x in paths]
    root = {}
    for chunks in sorted(paths, key=len, reverse=True):
        node = root
        for chunk in chunks:
            node = node.setdefault(chunk, {})
        node.clear()

    rv = set()

    def _walk(node, path):
        for prefix, child in iteritems(node):
            _walk(child, path + (prefix,))
        if not node:
            rv.add('/'.join(path))
    _walk(root, ())
    return rv

def _find_observable_paths(extra_files=None):
    """
    Finds all paths that should be observed.
    Tous les packages python sauf simMETpy et le package courant.
    """
    rv = set(os.path.dirname(os.path.abspath(x))
             if os.path.isfile(x) else os.path.abspath(x)
             for x in sys.path)
    
    for filename in extra_files or ():
        rv.add(os.path.dirname(os.path.abspath(filename)))

    excludes = [
        os.path.abspath(os.path.dirname(sys.modules["simMETpy"].__file__)),
        os.path.abspath(os.path.dirname(__file__))
        ]
    for module in list(sys.modules.values()):
        fn = getattr(module, '__file__', None)
        if fn is None:
            continue
        fn = os.path.dirname(os.path.abspath(fn))
        rv.add(fn)

    rv = sorted(rv, key=len, reverse=True)

    #rv = [r for r in rv if "simMETpy" not in r or "la vie de toto" not in r]

    R = _find_common_roots(rv)
    for r in R: print(r)
    return R

from werkzeug._reloader import WatchdogReloaderLoop

class webMETReloaderLoop(WatchdogReloaderLoop):

    def run(self):
        watches = {}
        observer = self.observer_class()
        observer.start()

        try:
            while not self.should_reload:
                to_delete = set(watches)
                paths = _find_observable_paths(self.extra_files)
                for path in paths:
                    if path not in watches:
                        try:
                            watches[path] = observer.schedule(
                                self.event_handler, path, recursive=True)
                        except OSError:
                            # Clear this path from list of watches We don't want
                            # the same error message showing again in the next
                            # iteration.
                            watches[path] = None
                    to_delete.discard(path)
                for path in to_delete:
                    watch = watches.pop(path, None)
                    if watch is not None:
                        observer.unschedule(watch)
                self.observable_paths = paths
                self._sleep(self.interval)
        finally:
            observer.stop()
            observer.join()

        sys.exit(3)
        
from werkzeug._reloader import reloader_loops
reloader_loops['webMETpy'] = webMETReloaderLoop

