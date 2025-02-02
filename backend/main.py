from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

import effect_gen
import decision_gen
from event_relevancy import get_relevant_events, stream_relevant_events

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


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
    country_codes: list[str]
    query: str
    max_events: int


@app.post("/relevant_events")
def relevant_events(input: RelevantEventsInput):
    result = get_relevant_events(
        input.company_context, input.country_codes, input.query, input.max_events
    )
    return result


@app.post("/stream_relevant_events")
def post_stream_relevant_events(input: RelevantEventsInput):
    return StreamingResponse(
        stream_relevant_events(
            input.company_context, input.country_codes, input.query, input.max_events
        )
    )
