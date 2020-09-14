# encoding utf-8
# © Thierry hervé

from flask import Flask
from flask.json import JSONEncoder, JSONDecoder


class EnhancedJSONEncoder(JSONEncoder):
    def default(self, o):
        if dataclasses.is_dataclass(o):
            return dataclasses.asdict(o)
        if isinstance(o, datetime):
            return {'__datetime__': o.isoformat(timespec='seconds')}
        return super().default(o)

class _decoder:
    def __init__(self):
        self.cache = {}
    def __call__(self,dct):
        if '__datetime__' in dct:
            return datetime.fromisoformat(dct['__datetime__'])
        if '__geo_interface__' in dct:
            return shape(dct['__geo_interface__'])
##        o = model.fromjson(dct, self.cache)
##        if o: return o
        return dct

class EnhancedJSONDecoder(JSONDecoder):
    def __init__(self, *args, **kargs):
        decoder = _decoder()
        kargs['object_hook'] =_decoder()
        super().__init__(*args, **kargs)
        
                

app = Flask(__name__)
app.json_encoder = EnhancedJSONEncoder
app.json_decoder = EnhancedJSONDecoder

if __name__ == '__main__':
    import dataclasses, flask
    @dataclasses.dataclass
    class InventoryItem:
        '''Class for keeping track of an item in inventory.'''
        name: str
        unit_price: float
        quantity_on_hand: int = 0

        @property
        def total_cost(self) -> float:
            return self.unit_price * self.quantity_on_hand

    i = InventoryItem("a", 2)
    print(i, i.total_cost)
    from datetime import datetime
    d = datetime.now()
    with app.app_context() as c:
        j = flask.json.dumps((i,d))
        print(j)
        print("decode j")
        print(flask.json.loads(j))
            
