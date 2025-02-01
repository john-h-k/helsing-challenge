from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


# Define a data model for the input using Pydantic
class TextInput(BaseModel):
    text: str


def retrieve_context(text: str) -> str:
    # For demonstration, we just prepend a message to the input text.
    return {1: "", 2: "", 3:""}


@app.post("/retrieve_context")
async def get_context(payload: TextInput):
    context = retrieve_context(payload.text)
    return {"context": context}
