import requests
import json
import re
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor


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

    return None


def main():
    fetch_functions = {
        "metaculus": fetch_metaculus,
        "manifold": fetch_manifold,
        "kalshi": fetch_kalshi,
    }

    results = {}

    with ThreadPoolExecutor() as executor:
        futures = {
            executor.submit(fetch_func): market
            for market, fetch_func in fetch_functions.items()
        }
        for future in futures:
            results[futures[future]] = future.result()

    all_markets = results["metaculus"] + results["manifold"] + results["kalshi"]

    with open("markets.json", "w") as f:
        json.dump(all_markets, f, indent=4)

    print("Saved market data to markets.json")


if __name__ == "__main__":
    main()
