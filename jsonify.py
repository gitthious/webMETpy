# encoding utf-8
# © Thierry hervé

"""
Module pour encoder et decoder des objets python, en plus des types de
base proposés par le module *json*.

Par exemple, si on instancie cette classe :
>>> class X:
...     def __init__(self, a, b): self.a = a; self.b = b
>>> x = X(2,['a', 'b'])

On pourra *jsonifié* l'objet *x* simplement par:
>>> print(dumps(x, indent=3))
Traceback (most recent call last):
...
TypeError: Object of type <class '__main__.X'> is not JSON serializable

La classe X n'est pas reconnue comme étant sérialisable!

Avec le module json, on pourrait redéfinir une classe *Encoder* et la passer
à la méthode *dump*. Mais on ne va pas le faire à chaque fois que l'on
à besoin d'encoder un objet :

>>> add_type(X)
>>> j = dumps(x)
>>> print(j)
{"a": 2, "b": ["a", "b"], "__class__": "X"}

Et le décodage...
>>> o = loads(j) 
>>> print(o) # doctest: +ELLIPSIS
<__main__.X object at 0x...>
>>> o.a
2
>>> o.b
['a', 'b']

**La classe X doit posséder un constructeur SANS kargs pour l'instant**.
Les attributs commençant par '_' ne sont ni encodés ni décodés.
Les *property* le sont.

Ce module supporte nativement l'encodage et le décodage des types :
- datetime.datetime
- tous les types shapes de shapely.geometry
- les dataclasses


>>> @dataclasses.dataclass
... class InventoryItem:
...     name: str
...     unit_price: float
...     quantity_on_hand: int = 0
...     loc: Point = Point(1,2)
...     @property
...     def total_cost(self) -> float:
...         return self.unit_price * self.quantity_on_hand
>>> i = InventoryItem("a", 2, 1)
>>> d = datetime(2021,4,24,7,37,28)
>>> r = dumps((i,d), indent=3)
>>> print(r)
[
   {
      "loc": {
         "__geo_interface__": {
            "type": "Point",
            "coordinates": [
               1.0,
               2.0
            ]
         }
      },
      "name": "a",
      "quantity_on_hand": 1,
      "total_cost": 2,
      "unit_price": 2,
      "__class__": "InventoryItem"
   },
   {
      "__datetime__": "2021-04-24T07:37:28"
   }
]
"""
from datetime import datetime
import dataclasses
import inspect

import json

    
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

def getattrval(o):
    return ((a,v) for a, v in inspect.getmembers(o, isattr) \
                    if not a.startswith('_'))
    
_supported_types = {}
def add_type(t):
    """
    Ajoute une classe dont les instances pourront
    être codées et décodées en json.
    """
    global _supported_types
    _supported_types[t.__name__] = t
    
class Encoder(json.JSONEncoder):
    def default(self, o):
        global _supported_types        
        if isinstance(o, datetime):
            return {'__datetime__': o.isoformat(timespec='seconds')}
        
        if isinstance(o, shape_types):
            return {'__geo_interface__': mapping(o)}

        if isinstance(o, tuple(_supported_types.values())) or dataclasses.is_dataclass(o):
            try:
                d = {a: v for a,v in getattrval(o)}
            except:
                print("Object responsable de l'erreur %s" % repr(o))
                raise
            d['__class__'] = type(o).__name__
            return d
        
        try:
            return super().default(o)
        except:
            print("Object resposable de l'erreur %s" % repr(o))
            raise

class _Decoder:
    
    def __call__(self,dct):
        if '__datetime__' in dct:
            return datetime.fromisoformat(dct['__datetime__'])
        if '__geo_interface__' in dct:
            return shape(dct['__geo_interface__'])
        if '__class__' in dct:
            global _supported_types
            cls = _supported_types[dct['__class__']]
            if dataclasses.is_dataclass(cls):
                args = [
                    dct[f.name] for f in dataclasses.fields(cls)
                    if f.default is dataclasses.MISSING
                ]
                kargs = {
                    f.name: dct[f.name] for f in dataclasses.fields(cls)
                    if f.default is not dataclasses.MISSING
                }
            else: # les autres types 
                del dct['__class__']
                args = list(dct.values())
                kargs = {}
            return cls(*args, **kargs)
            
        return dct

class Decoder(json.JSONDecoder):
    def __init__(self, *args, **kargs):
        # Obligé de passer par cet artifice car on ne peut pas
        # changer la signature pour passer la class Decoder
        # aux fonstions json.load et json.loads
        kargs['object_hook'] = _Decoder()    
        super().__init__(*args, **kargs)


# facilities
def dump(obj, fp, *args, **kargs):
    """cf. *json.dump*"""
    return json.dump(obj, fp, *args, cls=Encoder, **kargs)

def dumps(obj, *args, **kargs):
    """cf. *json.dumps*"""
    return json.dumps(obj, *args, cls=Encoder, **kargs)

def load(fp, *args, **kargs):
    """cf. *json.load*"""
    return json.loads(fp, *args, cls=Decoder, **kargs) 

def loads(s, *args, **kargs):
    """cf. *json.loads*"""
    return json.loads(s, *args, cls=Decoder, **kargs) 

__all__ = [
    "add_type",
    "dump", "dumps",
    "load", "loads",
    ]

if __name__ == '__main__':
    import doctest
    doctest.testmod()#verbose=True)    

    
            
