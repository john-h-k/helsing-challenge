from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import RootModel, BaseModel
from typing import Any, Dict, List
import json
import os

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
    company_context: str
    decision: str


@app.post("/effects")
def stream_effects(e: EffectsInput):
    it = effect_gen.generate_effects(e.company_context, e.decision)
    return StreamingResponse(it)


class DecisionsInput(BaseModel):
    company_context: str
    event: str


@app.post("/decisions")
def decisions(d: DecisionsInput):
    it = decision_gen.generate_decisions(d.company_context, d.event)
    return StreamingResponse(it)


class RelevantEventsInput(BaseModel):
    company_context: str
    country_codes: List[str]
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
    it = stream_relevant_events(
        input.company_context, input.country_codes, input.query, input.max_events
    )
    next(it)
    return StreamingResponse(it)


# Updated endpoint for setting company info using pydantic.RootModel.
class CompanyInfo(RootModel[Dict[str, Any]]):
    """
    A root model for an arbitrary JSON object representing company info.
    """
    pass


@app.post("/set_company")
def set_company(company: CompanyInfo):
    directory = "company_info"
    file_path = os.path.join(directory, "company.json")

    # Ensure the directory exists
    os.makedirs(directory, exist_ok=True)

    try:
        # For a RootModel, the value is available via the `root` attribute.
        with open(file_path, "w") as f:
            json.dump(company.root, f, indent=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error writing file: {e}")

    return {"message": "Company info updated successfully."}
