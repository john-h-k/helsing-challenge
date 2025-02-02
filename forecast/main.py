from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from elasticsearch import AsyncElasticsearch
from openai import OpenAI
from pydantic import BaseModel

import re
import requests

app = FastAPI()
es = AsyncElasticsearch("http://elasticsearch:9200")
client = OpenAI(
    api_key="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"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


def get_market_prob(market_data):
    market = market_data["market"]
    url = market_data["url"]

    if market == "metaculus":
        question_id = re.search(r"questions/(\d+)/", url).group(1)
        api_url = f"https://www.metaculus.com/api2/questions/{question_id}/"
        response = requests.get(api_url).json()
        return response.get("community_prediction", {}).get("full", {}).get("q2", None)

    elif market == "manifold":
        response = requests.get(url)
        match = re.search(r'"p":(\d+.\d+)', response.text)
        return float(match.group(1)) if match else None

    elif market == "kalshi":
        market_id = re.search(r"markets/(\d+)", url).group(1)
        api_url = f"https://trading-api.kalshi.com/v1/markets/{market_id}"
        response = requests.get(api_url).json()
        return response.get("yes_bid", None)

    elif market == "polymarket":
        market_id = re.search(r"\/market\/([a-f0-9-]+)", url).group(1)
        api_url = f"https://strapi-api.prod.polymarket.com/markets/{market_id}"
        response = requests.get(api_url).json()
        return response.get("probability", None)

    return None


class GetQuestions(BaseModel):
    question: str
    k: int


@app.post("/get_questions")
async def get_questions(q: GetQuestions):
    embedding = (
        client.embeddings.create(model="text-embedding-ada-002", input=q.question)
        .data[0]
        .embedding
    )

    query = {
        "bool": {
            "should": [
                {"match": {"title": q.question}},
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

    res = await es.search(index="markets", query=query, size=q.k)
    qs = []

    for hit in res["hits"]["hits"]:
        source = hit["_source"]
        qs.append(
            {
                "id": source["id"],
                "title": source["title"],
                "market": source["market"],
                "url": source["url"],
                "p": get_market_prob(hit),
            }
        )

    return qs
