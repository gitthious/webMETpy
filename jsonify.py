# encoding utf-8
# © Thierry hervé

import dataclasses
from datetime import datetime

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

    
class Encoder(JSONEncoder):
    def default(self, o):
        if dataclasses.is_dataclass(o):
            d = dataclasses.asdict(o)
            for a in dir(o):
                if isinstance(getattr(type(o),a,None),property): 
                    d[a] = getattr(o,a)
            d['__class__'] = type(o).__name__
            return d
        
        if isinstance(o, datetime):
            return {'__datetime__': o.isoformat(timespec='seconds')}
        
        if isinstance(o, shape_types):
            return mapping(o)
        
        return super().default(o)

class _Decoder:
    def __call__(self,dct):
        if '__datetime__' in dct:
            return datetime.fromisoformat(dct['__datetime__'])
        if '__geo_interface__' in dct:
            return shape(dct['__geo_interface__'])
        return dct

class Decoder(JSONDecoder):
    def __init__(self, *args, **kargs):
        kargs['object_hook'] = _Decoder()
        super().__init__(*args, **kargs)

if __name__ == '__main__':
##    import flask
##    app = Flask(__name__)
##    app.json_encoder = METJSONEncoder
##    app.json_decoder = METJSONDecoder

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
    print(j)
    print("decode j")
    print(json.loads(j, cls=Decoder))
    
##    with app.app_context() as c:
##        j = flask.json.dumps((i,d))
##        print(j)
##        print("decode j")
##        print(flask.json.loads(j))
            
