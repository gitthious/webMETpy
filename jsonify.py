# encoding utf-8
# © Thierry hervé

import dataclasses
from datetime import datetime
from simMETpy import sim
import inspect

from flask import json
from flask.json import JSONEncoder, JSONDecoder


from shapely.geometry import (
    mapping, shape,
    Point, LineString, LinearRing, Polygon,
    MultiPoint, MultiLineString, MultiPolygon
    )

shape_types = (
    Point, LineString, LinearRing, Polygon,
    MultiPoint, MultiLineString, MultiPolygon
    )

def isattr(o):
    return     not inspect.ismethod(o) \
           and not inspect.isfunction(o)

class Encoder(JSONEncoder):
    def default(self, o):
        if dataclasses.is_dataclass(o):
            # récupère tous les attributs de la dataclass
            # et ceux de l'objet qui sont des properties
            d = dataclasses.asdict(o)
            for a in dir(o):
                if isinstance(getattr(type(o),a,None),property):
                    d[a] = getattr(o,a)

            d['__class__'] = type(o).__name__
            return d

        if isinstance(o, sim.Init):
            d = {}
            for a, v in inspect.getmembers(o, isattr):
                if a.startswith('_'): continue
                d[a] = v
            d['__class__'] = type(o).__name__
            return d

        if isinstance(o, type) and issubclass(o, sim.SimAgent):
            ta = {'type_agent': o.__name__, 'comportements': []}
            for m in sim.ordres(o) + sim.ordres_de_conduite(o):
                sig = inspect.signature(m)
                P = []
                for p in sig.parameters.values():
                    if p.annotation is inspect.Parameter.empty: continue
                    d = {
                        'name': p.name,
                        'type': p.annotation.__name__,
                    }
                    if p.default != inspect.Parameter.empty:
                        d['default'] = p.default
                    P.append(d)
                    
                c = {
                    'nom': m.__name__,
                    'params': P,
                }
                ta['comportements'].append(c)
            return ta

            
        if isinstance(o, datetime):
            return {'__datetime__': o.isoformat(timespec='seconds')}
        
        if isinstance(o, shape_types):
            return mapping(o)
        
        return super().default(o)

class _Decoder:
    
    def __init__(self, model=globals()):
        self.model = model
        
    def __call__(self,dct):
        if '__datetime__' in dct:
            return datetime.fromisoformat(dct['__datetime__'])
        if '__geo_interface__' in dct:
            return shape(dct['__geo_interface__'])
        if '__class__' in dct:
            cls = self.model[dct['__class__']]
            args = [
                dct[f.name] for f in dataclasses.fields(cls)
                if f.default is dataclasses.MISSING
            ]
            kargs = {
                f.name: dct[f.name] for f in dataclasses.fields(cls)
                if f.default is not dataclasses.MISSING
            }
            del dct['__class__']
            return cls(*args, **kargs)
            
        return dct

class Decoder(JSONDecoder):
    def __init__(self, *args, **kargs):
        model = kargs.get('model', None)
        if model:
            del kargs['model']
            kargs['object_hook'] = _Decoder(model)
        else:
            kargs['object_hook'] = _Decoder()
            
        super().__init__(*args, **kargs)

if __name__ == '__main__':
##    import flask
##    app = Flask(__name__)
##    app.json_encoder = Encoder
##    app.json_decoder = Decoder

    import dataclasses
    
    @dataclasses.dataclass
    class InventoryItem:
        '''Class for keeping track of an item in inventory.'''
        name: str
        unit_price: float
        quantity_on_hand: int = 0
        loc: Point = Point(1,2)

        @property
        def total_cost(self) -> float:
            return self.unit_price * self.quantity_on_hand

    i = InventoryItem("a", 2, 1)
    from datetime import datetime
    d = datetime.now()
    import json
    j = json.dumps((i,d), cls=Encoder)
    print(i)
    print(j)
    print("decode j")
    print(json.loads(j, cls=Decoder))

    Encoder.attrs_a_encoder = ("name", "unit_price")
    j = json.dumps((i,d), cls=Encoder)
    print(j)
    
##    with app.app_context() as c:
##        j = flask.json.dumps((i,d))
##        print(j)
##        print("decode j")
##        print(flask.json.loads(j))
            
