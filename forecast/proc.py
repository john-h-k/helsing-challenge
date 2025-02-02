import json
from elasticsearch import Elasticsearch
from openai import OpenAI
import os

es = Elasticsearch("http://localhost:9200")
client = OpenAI(
    api_key="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"
)

if not es.indices.exists(index="markets"):
    es.indices.create(
        index="markets",
        mappings={
            "properties": {
                "id": {"type": "keyword"},
                "title": {"type": "text"},
                "title_vector": {"type": "dense_vector", "dims": 1536},
                "url": {"type": "keyword"},
                "market": {"type": "keyword"},
            }
        },
    )

with open("markets.json") as f:
    data = json.load(f)

for entry in data:
    embedding = (
        client.embeddings.create(model="text-embedding-ada-002", input=entry["title"])
        .data[0]
        .embedding
    )

    es.index(
        index="markets",
        id=entry["id"],
        document={
            "id": entry["id"],
            "title": entry["title"],
            "title_vector": embedding,
            "url": entry["url"],
            "market": entry["market"],
        },
    )
