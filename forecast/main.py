from fastapi import FastAPI
from elasticsearch import AsyncElasticsearch
from openai import OpenAI
import os

app = FastAPI()
es = AsyncElasticsearch("http://elasticsearch:9200")
client = OpenAI(
    api_key="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"
)


@app.post("/get_questions")
async def get_questions(question: str, k: int):
    embedding = (
        client.embeddings.create(model="text-embedding-ada-002", input=question)
        .data[0]
        .embedding
    )

    query = {
        "bool": {
            "should": [
                {"match": {"title": question}},
                {
                    "script_score": {
                        "query": {"match_all": {}},
                        "script": {
                            "source": "cosineSimilarity(params.query_vector, 'title_vector') + 1.0",
                            "params": {"query_vector": embedding},
                        },
                    }
                },
            ]
        }
    }

    res = await es.search(index="markets", query=query, size=k)
    return [hit["_source"] for hit in res["hits"]["hits"]]
