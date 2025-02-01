from fastapi import FastAPI
from pydantic import BaseModel

from rag import LlamaIndexRetriever

app = FastAPI()

retriever = LlamaIndexRetriever()


# Define a data model for the input using Pydantic
class TextInput(BaseModel):
    text: str


def retrieve_context(text: str) -> str:
    return retriever.retrieve_context(text)


@app.post("/retrieve_context")
async def get_context(payload: TextInput):
    context = retrieve_context(payload.text)
    return {"context": context}
