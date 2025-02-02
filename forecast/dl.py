import requests
import json
import re
import time
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor


def fetch_polymarket():
    with open("../polymarket/markets.json") as file:
        data = json.load(file)

    def _get_url(cid):
        while True:
            r = requests.get(
                f"https://gamma-api.polymarket.com/markets?condition_ids={cid}"
            )

            if r.status_code == 429:
                time.sleep(3)
                continue

            break

        r = r.json()[0]
        return f"https://polymarket.com/event/{r["slug"]}"

    markets = []
    for n, q in enumerate(data, start=1):
        print(f"{n}/{len(data)}")
        markets.append(
            [
                {
                    "id": str(q["id"]),
                    "title": q["name"],
                    "url": _get_url(q["id"]),
                    "market": "polymarket",
                }
            ]
        )
    return markets


def fetch_metaculus():
    url = "https://www.metaculus.com/api2/questions/?order_by=-popularity&limit=1000"
    response = requests.get(url)
    data = response.json()["results"]
    return [
        {
            "id": str(q["id"]),
            "title": q["title"],
            "url": f"https://www.metaculus.com/questions/{q['id']}/",
            "market": "metaculus",
        }
        for q in data
    ]


def fetch_manifold():
    url = "https://manifold.markets/api/v0/markets?limit=1000&sort=last-bet-time"
    response = requests.get(url)
    data = response.json()
    return [
        {"id": q["id"], "title": q["question"], "url": q["url"], "market": "manifold"}
        for q in data
    ]


def fetch_kalshi():
    return []
    # url = "https://trading-api.kalshi.com/v1/markets"
    # headers = {"User-Agent": "Mozilla/5.0"}
    # response = requests.get(url, headers=headers)
    # data = response.json()["markets"]
    # return [
    #     {
    #         "id": q["ticker"] or q["id"],
    #         "title": q["title"],
    #         "url": f"https://kalshi.com/markets/{q['id']}",
    #         "market": "kalshi",
    #     }
    #     for q in data[:1000]
    # ]


def main():
    # fetch_functions = {
    #     "metaculus": fetch_metaculus,
    #     "manifold": fetch_manifold,
    #     "kalshi": fetch_kalshi,
    #     "polymarket": fetch_polymarket,
    # }

    # results = {}

    # with ThreadPoolExecutor() as executor:
    #     futures = {
    #         executor.submit(fetch_func): market
    #         for market, fetch_func in fetch_functions.items()
    #     }
    #     for future in futures:
    #         results[futures[future]] = future.result()

    # all_markets = results["metaculus"] + results["manifold"] + results["kalshi"]
    with open("markets.json") as f:
        ex = json.load(f)

    pm = fetch_polymarket()
    all_markets = ex + pm

    with open("markets.json", "w") as f:
        json.dump(all_markets, f, indent=4)

    print("Saved market data to markets.json")


if __name__ == "__main__":
    main()
