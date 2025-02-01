from fastapi import FastAPI
from pydantic import BaseModel

from backend import effect_gen, decision_gen

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "hello, world!"}


class EffectsInput(BaseModel):
    decision: str


@app.post("/effects")
def effects(e: EffectsInput):
    tree = effect_gen.generate_effects(e.decision)
    return tree


class DecisionsInput(BaseModel):
    event: str


@app.post("/decisions")
def decisions(d: DecisionsInput):
    decisions = decision_gen.generate_decision(d.event)
