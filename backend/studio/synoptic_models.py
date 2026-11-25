"""Data-only, bounded synoptic contract. No SVG, expressions, scripts or external URLs."""
from typing import Literal, Annotated
from pydantic import BaseModel, ConfigDict, Field, model_validator

Identifier = Annotated[str, Field(pattern=r'^[A-Za-z0-9_-]{1,80}$')]
Coordinate = Annotated[float, Field(ge=-10000, le=10000, allow_inf_nan=False)]
Channel = Literal['state', 'value', 'alarm', 'command']

class DataModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Evidence(DataModel):
    origin: Literal['explicit','hypothesis','manual'] = 'hypothesis'
    source: Literal['st','io','description','manual'] = 'st'
    quote: str = Field(default='', max_length=500)
    confirmed: bool = False

class Binding(Evidence):
    variable: str = Field(min_length=1, max_length=160)

class Position(DataModel):
    x: Coordinate = 0
    y: Coordinate = 0

class PlantNode(DataModel):
    id: Identifier
    kind: Literal['motor','pump','valve','tank','sensor','button','lamp','numeric']
    label: str = Field(min_length=1,max_length=120)
    position: Position = Field(default_factory=Position)
    evidence: Evidence = Field(default_factory=Evidence)
    bindings: dict[Channel, Binding] = Field(default_factory=dict, max_length=4)
    manual: bool = False

class PlantEdge(DataModel):
    id: Identifier
    source: Identifier
    target: Identifier
    label: str = Field(default='Relazione funzionale', max_length=120)
    kind: Literal['functional'] = 'functional'
    evidence: Evidence = Field(default_factory=Evidence)
    manual: bool = False

class Layout(DataModel):
    version: Literal[1] = 1
    nodes: list[PlantNode] = Field(default_factory=list, max_length=80)
    edges: list[PlantEdge] = Field(default_factory=list, max_length=160)
    deleted_node_ids: list[Identifier] = Field(default_factory=list,max_length=500)
    deleted_edge_ids: list[Identifier] = Field(default_factory=list,max_length=1000)
    description: str = Field(default='',max_length=16000)
    io_list: str = Field(default='',max_length=16000)
    source_hash: str = Field(default='',max_length=64)

    @model_validator(mode='after')
    def coherent_graph(self):
        ids={n.id for n in self.nodes}
        if len(ids)!=len(self.nodes) or len({e.id for e in self.edges})!=len(self.edges):
            raise ValueError('ID duplicati nel sinottico')
        if ids.intersection(self.deleted_node_ids) or {e.id for e in self.edges}.intersection(self.deleted_edge_ids):
            raise ValueError('Elemento presente anche fra quelli eliminati')
        if any(e.source not in ids or e.target not in ids for e in self.edges):
            raise ValueError('Collegamento con estremi inesistenti')
        return self
