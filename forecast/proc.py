import json
import os
from concurrent.futures import ThreadPoolExecutor
from elasticsearch import Elasticsearch, helpers
from openai import OpenAI

# init clients
es = Elasticsearch("http://localhost:9200")
client = OpenAI(
    api_key="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"
)

# ensure index exists
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

# load data
with open("markets.json") as f:
    data = json.load(f)


# function to generate embeddings
n = 1
total = len(data)


def get_embedding(entry):
    global n
    print(f"{n}/{total}")
    n += 1
    embedding = (
        client.embeddings.create(model="text-embedding-ada-002", input=entry["title"])
        .data[0]
        .embedding
    )
    entry["title_vector"] = embedding
    return entry


# process embeddings concurrently
with ThreadPoolExecutor() as executor:
    processed_data = list(executor.map(get_embedding, data))

# bulk upload to elasticsearch
actions = [
    {
        "_index": "markets",
        "_id": entry["id"],
        "_source": entry,
    }
    for entry in processed_data
]

print("Bulk uploading...")
helpers.bulk(es, actions)

print(f"Uploaded {len(processed_data)} records to Elasticsearch.")
