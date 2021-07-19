# encoding utf-8
# © Thierry hervé

"""
Module pour encoder et decoder des objets python, en plus des types de
base proposés par le module *json* ou *flask.json*.

Par exemple, si on instancie cette classe :
>>> class X:
...     def __init__(self, a, b): self.a = a; self.b = b
>>> x = X(2,['a', 'b'])

On pourra *jsonifié* l'objet *x* simplement par:
>>> print(dumps(x, indent=3)) # doctest: +ELLIPSIS
Traceback (most recent call last):
...
TypeError: Object responsable...

La classe X n'est pas reconnue comme étant sérialisable!

Ce module supporte nativement l'encodage et le décodage des types :
- datetime.datetime
- tous les types shapes de shapely.geometry (si shapely est installé)
- les dataclasses

Avec le module json, on pourrait redéfinir une classe *Encoder* et la passer
à la méthode *dump*. Mais on ne va pas le faire à chaque fois que l'on
à besoin d'encoder un objet :

>>> add_type(X)
>>> j = dumps(x)
>>> print(j) # doctest: +ELLIPSIS
{"__class__": "X", "__id__": ..., "a": 2, "b": ["a", "b"]}

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
>>> print(r) # doctest: +ELLIPSIS
[
   {
      "__class__": "InventoryItem",
      "__id__": ...,
      "loc": {
         "__geo_interface__": {
            "coordinates": [
               1.0,
               2.0
            ],
            "type": "Point"
         }
      },
      "name": "a",
      "quantity_on_hand": 1,
      "total_cost": 2,
      "unit_price": 2
   },
   {
      "__datetime__": "2021-04-24T07:37:28"
   }
]

json ne sait pas décoder les références ciculaires en générant
l'exception ValueError: Circular reference detected). Ce module permet
de ce substituer à ce manque en encodant et décodant une référence aux objets
référencés plusieurs fois

>>> class Y:
...     def __init__(self,n): self.n = n
>>> class Z:
...     def __init__(self,n): self.n = n
>>> add_type(Y,Z)
>>> y = Y('y'); z = Z('z')
>>> y.z = z; z.y = y
>>> d = dumps([y,z], indent=3)
>>> print(d) # doctest: +ELLIPSIS
[
   {
      "__class__": "Y",
      "__id__": ...,
      "n": "y",
      "z": {
         "__class__": "Z",
         "__id__": ...,
         "n": "z",
         "y": {
            "__refid__": ...
         }
      }
   },
   {
      "__refid__": ...
   }
]
    
>>> y, z = loads(d)
>>> print(y, z) # doctest: +ELLIPSIS
<__main__.Y object at 0x...> <__main__.Z object at 0x...>

>>> print(y.z, z.y) # doctest: +ELLIPSIS
<__main__.Z object at 0x...> <__main__.Y object at 0x...>

Au pire, bien que cela ne soit certainement pas très courant ;)
il reste toujours des références circulaires non détectables

>>> class Y:
...     def __init__(self): self.a = self
>>> add_type(Y)
>>> y = Y()
>>> print(dumps(y))
Traceback (most recent call last):
...
ValueError: Circular reference detected
"""


from datetime import datetime
import dataclasses
from collections.abc import Iterable
import inspect

try:
    from flask import json
except ImportError:
    try:
        import simplejson as json
    except ImportError:
        import json

try:
    from shapely.geometry import (
        mapping, shape,
        Point, LineString, LinearRing, Polygon,
        MultiPoint, MultiLineString, MultiPolygon
        )

    shape_types = (
        Point, LineString, LinearRing, Polygon,
        MultiPoint, MultiLineString, MultiPolygon
        )
except ImportError:
    shape_types = ()

try:
    import networkx as nx
    networkx_types = (nx.Graph, nx.DiGraph, nx.MultiGraph, nx.MultiDiGraph)
    from networkx.readwrite import json_graph
except ImportError:
    networkx_types = ()

def isattr(o):
    return     not inspect.ismethod(o) \
           and not inspect.isfunction(o) 

def getattrval(o):
    return ((a,v) for a, v in inspect.getmembers(o, isattr) \
                    if not a.startswith('_'))
    
_supported_types = {}
def add_type(*types):
    """
    Ajoute une classe ou plusieurs dont les instances pourront
    être codées et décodées en json.
    """
    global _supported_types
    for t in types:
        _supported_types[t.__name__] = t
    
class Encoder(json.JSONEncoder):
    def __init__(self, *args, **kargs):
        super().__init__(*args, **kargs)
        self.objids = []
    
    def default(self, o):
        global _supported_types        
        if isinstance(o, datetime):
            return {'__datetime__': o.isoformat(timespec='seconds')}
        
        if isinstance(o, shape_types):
            return {'__geo_interface__': mapping(o)}

        if isinstance(o, networkx_types):
            return json_graph.node_link_data(o)
        
        if isinstance(o, tuple(_supported_types.values())) \
        or dataclasses.is_dataclass(o):
            d = {}
            if id(o) in self.objids:
                d['__refid__'] = id(o)
                return d
            try:
                for a,v in getattrval(o):
                    if isinstance(v, tuple(_supported_types.values())) \
                    or dataclasses.is_dataclass(v):
                        if id(v) in self.objids:
                            d[a] = {'__refid__': id(v) }
                        else:
                            d[a] = v                        
                    else:
                        d[a] = v
                d['__class__'] = type(o).__name__
                d['__id__'] = id(o)
            except TypeError:
                raise TypeError("Object responsable de l'erreur %s" % repr(o))
            self.objids.append(id(o))            
            return d
        
        try:
            d = super().default(o)
            return d
        except:
            raise TypeError("Object responsable de l'erreur %s" % repr(o))

class _Decoder:
    def __init__(self):
        self.objids = {}
        self.ids_inconnus = []
        
    def __call__(self, dct):
        if '__datetime__' in dct:
            return datetime.fromisoformat(dct['__datetime__'])
        if '__geo_interface__' in dct:
            return shape(dct['__geo_interface__'])
        
        if '__refid__' in dct:
            try:
                return self.objids[dct['__refid__']]
            except KeyError:
                self.ids_inconnus.append(dct['__refid__'])
                        
        if '__class__' in dct:
            global _supported_types
            cls = _supported_types[dct['__class__']]
            argnames, kargnames = self.init_params(cls)
            del dct['__class__']

            args = []; kargs = {}; others = {}
            for a in dct:
                v = dct[a]
                
                if a in argnames:
                    args.append(v)
                elif a in kargnames:
                    kargs[a] = v
                else:
                    others[a] = v
            
            o = cls(*args, **kargs)
            self.objids[dct['__id__']] = o
            
            for a in others:
                setattr(o, a, others[a])

            return o

        return dct

    @classmethod
    def init_params(cls, objtype):
        if dataclasses.is_dataclass(objtype):
            argnames = [
                f.name for f in dataclasses.fields(objtype)
                if f.default is dataclasses.MISSING
            ]
            kargnames = [
                f.name for f in dataclasses.fields(objtype)
                if f.default is not dataclasses.MISSING
            ]
        else:
            argspec = inspect.getfullargspec(objtype.__init__)
            argspec.args.remove('self')
            nbkargs = len(argspec.defaults) if argspec.defaults else 0
            nbargs = len(argspec.args)
            argnames = argspec.args[:nbargs-nbkargs]
            kargnames = argspec.args[nbargs-nbkargs:]
        return argnames, kargnames

    def complete_refid(self, o):
        if len(self.ids_inconnus) == 0: return o

        if not isinstance(o, Iterable):
            for a,v in getattrval(o):
                if isinstance(v, dict) and '__refid__' in v:
                    setattr(o, a, self.objids[v['__refid__']])
        else:
            for oo in o:
                self.complete_refid(oo)
        return o


class Decoder(json.JSONDecoder):
    def __init__(self, *args, **kargs):
        # Obligé de passer par cet artifice car on ne peut pas
        # changer la signature pour passer la class Decoder
        # aux fonstions json.load et json.loads
        self.decoder = kargs['object_hook'] = _Decoder()    
        super().__init__(*args, **kargs)
    def raw_decode(self, s, idx=0):
        obj = super().raw_decode(s, idx)
        return self.decoder.complete_refid(obj)
        
# facilities
def dump(obj, fp, *args, **kargs):
    """cf. *json.dump*"""
    return json.dump(obj, fp, *args, cls=Encoder, **kargs)

def dumps(obj, *args, **kargs):
    """cf. *json.dumps*"""
    return json.dumps(obj, *args, cls=Encoder, **kargs)

def load(fp, *args, **kargs):
    """cf. *json.load*"""
    return json.load(fp, *args, cls=Decoder, **kargs)

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

##    class Y:
##        def __init__(self,n): self.n = n
##    class Z:
##        def __init__(self,n): self.n = n
##
##    add_type(Y,Z)
##    y = Y('y'); z = Z('z')
##    y.z = z; z.y = y
##    d = dumps([y,z], indent=3)
##    print(d)
##
##    y, z = loads(d)
##    print(y, z)
##    print(y.z, z.y)
    
##    
##    class X:
##        def __init__(self, a, b): self.a = a; self.b = b
##    x = X(2,['a', 'b'])
##    add_type(X)
##    j = dumps(x)
##    print(j)
##    o = loads(j) 
##    print(o)

##    @dataclasses.dataclass
##    class InventoryItem:
##        name: str
##        unit_price: float
##        quantity_on_hand: int = 0
##        loc: Point = Point(1,2)
##        @property
##        def total_cost(self) -> float:
##           return self.unit_price * self.quantity_on_hand
##    i = InventoryItem("a", 2, 1)
##    d = datetime(2021,4,24,7,37,28)
##    r = dumps((i,d), indent=3)
##    print(r) # doctest: +ELLIPSIS
