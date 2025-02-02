from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from elasticsearch import AsyncElasticsearch
from openai import OpenAI
from pydantic import BaseModel

import json
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
        api_url = f"https://www.metaculus.com/api2/questions/{market_data["id"]}/"
        res = requests.get(api_url).json()
        print(res.keys())
        return float(
            res["question"]["aggregations"]["recency_weighted"]["latest"]["means"][0]
        )

    elif market == "manifold":
        response = requests.get(url)
        print(response.text)
        match = re.search(r"probability=(\d+\.?\d*)%", response.text)
        return float(match.group(1)) / 100 if match else None

    elif market == "kalshi":
        market_id = re.search(r"markets/(\d+)", url).group(1)
        api_url = f"https://trading-api.kalshi.com/v1/markets/{market_id}"
        response = requests.get(api_url).json()
        return response.get("yes_bid", None)

    elif market == "polymarket":
        cid = market_data["id"]
        api_url = f"https://gamma-api.polymarket.com/markets?condition_ids={cid}"
        price = json.loads(requests.get(api_url).json()[0]["outcomePrices"])[0]
        return float(price)

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

    hits = []
    for m in ("polymarket", "manifold", "metaculus"):
        query = {
            "bool": {
                "must": {"match": {"market": m}},
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
                ],
            }
        }

        res = await es.search(index="markets", query=query, size=1)
        hits.extend(hit["_source"] for hit in res["hits"]["hits"])

    qs = []

    for source in hits:
        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",  # Replace with the correct model if needed
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are charged with determining whether a prediction market title is highly relevant to a question"
                        "Respond with a single boolean value true/false plain text and nothing else"
                    ),
                },
                {
                    "role": "user",
                    "content": f"Question: {q.question}\nMarket title: {source["title"]}",
                },
            ],
            temperature=0,
        )

        if response.choices[0].message.content.strip() != "true":
            continue

        try:
            qs.append(
                {
                    "id": source["id"],
                    "title": source["title"],
                    "market": source["market"],
                    "url": source["url"],
                    "p": get_market_prob(source),
                }
            )
        except Exception as e:
            print(repr(e))
            pass

    return qs
