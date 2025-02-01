from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

import effect_gen
import decision_gen
from event_relevancy import get_relevant_events

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
    return decisions

# New endpoint for retrieving relevant events based on regulatory or news inputs.
class RelevantEventsInput(BaseModel):
    company_context: str
    country_codes: List[str]
    query: str
    max_events: int

@app.post("/relevant_events")
def relevant_events(input: RelevantEventsInput):
    result = get_relevant_events(input.company_context, input.country_codes, input.query, input.max_events)
    return result
