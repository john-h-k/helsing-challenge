from py_clob_client.constants import POLYGON
from py_clob_client.client import ClobClient
from sentence_transformers import SentenceTransformer
from rapidfuzz import process, fuzz
from dotenv import load_dotenv
from typing import List, Dict
from collections import defaultdict

import torch
import datetime
import os
import time
import json


class PolymarketSearch:
    EXCLUDED_CATEGORIES = ["Sports", "Celebrity"]

    CATEGORIES = {
        "Politics": {
            "desc": "Elections voting political government policies sanctions congress parliament democracy",
            "keywords": [
                "election",
                "vote",
                "government",
                "politics",
                "democratic",
                "republican",
                "senate",
            ],
        },
        "Economics": {
            "desc": "Market prices GDP inflation interest rates economic financial treasury forex commodities",
            "keywords": [
                "price",
                "market",
                "economy",
                "financial",
                "stock",
                "trade",
                "dollar",
            ],
        },
        "Technology": {
            "desc": "Cryptocurrency blockchain AI technology software digital computing crypto bitcoin",
            "keywords": [
                "crypto",
                "blockchain",
                "bitcoin",
                "tech",
                "ai",
                "software",
                "digital",
            ],
        },
        "Sports": {
            "desc": "Sports games tournaments championships athletics teams players competition",
            "keywords": [
                "sport",
                "game",
                "team",
                "player",
                "championship",
                "tournament",
                "match",
            ],
        },
        "Celebrity": {
            "desc": "Entertainment celebrity actors movies shows awards drama social media gossip",
            "keywords": [
                "celebrity",
                "actor",
                "movie",
                "show",
                "drama",
                "award",
                "star",
                "famous",
            ],
        },
    }

    CATEGORY_SIMILARITY_THRESHOLD = 0.05  # 5% threshold

    def __init__(self, env_path: str = "keys.env"):
        # load API key and model
        load_dotenv(env_path)
        self.model = SentenceTransformer("all-mpnet-base-v2")
        self.markets = []
        self.processed_markets = []

    def fetch_markets(self) -> None:
        """Fetch active markets from Polymarket"""
        print("\nFetching markets from Polymarket API...")

        # check if JSON cache exists
        if os.path.exists("markets.json"):
            with open("markets.json", "r") as f:
                self.markets = json.load(f)
            print(f"Loaded {len(self.markets)} active markets from cache")
            return

        client = ClobClient(
            "https://clob.polymarket.com", key=os.getenv("PK"), chain_id=POLYGON
        )
        client.set_api_creds(client.create_or_derive_api_creds())

        not_exercised = []
        curr_cursor = ""

        while curr_cursor != "LTE=":
            res = client.get_markets(next_cursor=curr_cursor)
            for market in res["data"]:
                if self._is_valid_market(market):
                    not_exercised.append(self._format_market(market))
            curr_cursor = res["next_cursor"]

        self.markets = not_exercised
        print(f"Found {len(self.markets)} active markets")

        # Save to JSON cache
        with open("markets.json", "w") as f:
            json.dump(self.markets, f, indent=2)

    def process_markets(self) -> None:
        """Classify and process markets"""
        print("\nGenerating market embeddings...")

        # check if JSON cache exists
        if os.path.exists("processed_markets.json"):
            with open("processed_markets.json", "r") as f:
                self.processed_markets = json.load(f)
            print(f"Loaded {len(self.processed_markets)} processed markets from cache")

            # Print category distribution
            category_counts = defaultdict(int)
            for market in self.processed_markets:
                category_counts[market["primary_category"]] += 1
            for category, count in category_counts.items():
                print(f"{category}: {count} markets")
            return

        start = time.time()

        market_texts = [m["name"] for m in self.markets]
        market_embeddings = self.model.encode(
            market_texts, convert_to_tensor=True, batch_size=32
        )

        category_embeddings = {
            cat: self.model.encode(info["desc"], convert_to_tensor=True)
            for cat, info in self.CATEGORIES.items()
        }
        self.processed_markets = self._classify_markets(
            market_embeddings, category_embeddings
        )

        print(
            f"Processed {len(self.processed_markets)} markets in {time.time() - start:.2f}s"
        )
        # Print category distribution
        category_counts = defaultdict(int)
        for market in self.processed_markets:
            category_counts[market["primary_category"]] += 1
        for category, count in category_counts.items():
            print(f"{category}: {count} markets")

        # Save to JSON cache
        with open("processed_markets.json", "w") as f:
            json.dump(self.processed_markets, f, indent=2)

    def search_markets(
        self, query: str, num_results: int = 5, threshold: int = 0.6
    ) -> List[Dict]:
        print(f"\nSearching markets for: '{query}'")

        # Filter excluded categories
        relevant_markets = [
            market
            for market in self.processed_markets
            if (
                market["primary_category"] not in self.EXCLUDED_CATEGORIES
                and (
                    not market["is_multi_category"]
                    or market["secondary_category"] not in self.EXCLUDED_CATEGORIES
                )
            )
        ]

        # Calculate semantic similarity scores
        new_model = SentenceTransformer("all-mpnet-base-v2")
        query_embedding = new_model.encode(query, convert_to_tensor=True)
        market_names = [market["name"] for market in relevant_markets]
        market_embeddings = new_model.encode(market_names, convert_to_tensor=True)
        semantic_scores = (
            torch.nn.functional.cosine_similarity(
                query_embedding.unsqueeze(0), market_embeddings
            )
            .squeeze()
            .tolist()
        )

        # Perform fuzzy matching
        market_info = [(market["name"], market) for market in relevant_markets]
        fuzzy_matches = process.extract(
            query,
            [info[0] for info in market_info],
            scorer=fuzz.partial_token_sort_ratio,
            limit=None,
        )

        # Combine scores
        combined_scores = [
            (market_info[idx][1], semantic_scores[idx], fuzzy_score)
            for match, fuzzy_score, idx in fuzzy_matches
        ]

        # Create results with hybrid scores
        scored_markets = [
            {
                **market,
                "score": 0.7 * semantic_score + 0.003 * fuzzy_score,
            }
            for market, semantic_score, fuzzy_score in combined_scores
            if 0.7 * semantic_score + 0.003 * fuzzy_score >= threshold
        ]

        # Sort by combined score
        scored_markets.sort(key=lambda x: x["score"], reverse=True)
        return scored_markets[:num_results]

    def _is_valid_market(self, market: Dict) -> bool:
        """Check if market is valid for processing"""
        if market["closed"] or not market["active"]:
            return False

        if market["tokens"][0]["price"] == 0:
            return False

        end_date = market["end_date_iso"]
        if end_date and datetime.datetime.now() >= datetime.datetime.fromisoformat(
            end_date
        ).replace(tzinfo=None):
            return False

        return True

    def _format_market(self, market: Dict) -> Dict:
        """Format market data"""
        end_date = market["end_date_iso"]
        return {
            "id": market["condition_id"],
            "name": market["question"],
            "description": market["description"],
            "outcomes": market["tokens"],
            "end_date": end_date[:10] if end_date else "NA",
        }

    def _classify_markets(
        self, market_embeddings: torch.Tensor, category_embeddings: Dict
    ) -> List[Dict]:
        """Classify markets into categories"""
        similarities = self._calculate_similarities(
            market_embeddings, category_embeddings
        )

        classified_markets = []
        for idx, market in enumerate(self.markets):
            market_similarities = {
                cat: float(similarities[cat][idx]) for cat in self.CATEGORIES.keys()
            }

            sorted_categories = sorted(
                market_similarities.items(), key=lambda x: x[1], reverse=True
            )

            # Check if top two categories are within threshold
            is_multi_category = False
            secondary_category = None
            if len(sorted_categories) > 1:
                top_score = sorted_categories[0][1]
                second_score = sorted_categories[1][1]
                if (
                    top_score - second_score
                ) / top_score <= self.CATEGORY_SIMILARITY_THRESHOLD:
                    is_multi_category = True
                    secondary_category = sorted_categories[1][0]

            classified_markets.append(
                {
                    **market,
                    "primary_category": sorted_categories[0][0],
                    "category_score": float(sorted_categories[0][1]),
                    "is_multi_category": is_multi_category,
                    "secondary_category": secondary_category,
                    "category_scores": market_similarities,
                }
            )

        return classified_markets

    def _calculate_similarities(
        self, market_embeddings: torch.Tensor, category_embeddings: Dict
    ) -> Dict:
        """Calculate similarity scores"""
        similarities = {}
        for cat, cat_emb in category_embeddings.items():
            similarities[cat] = torch.nn.functional.cosine_similarity(
                market_embeddings.unsqueeze(1), cat_emb.unsqueeze(0), dim=2
            ).squeeze()
        return similarities


if __name__ == "__main__":
    searcher = PolymarketSearch()
    searcher.fetch_markets()
    searcher.process_markets()

    # Example search
    query = "Will any tariffs be imposed in 2025?"
    results = searcher.search_markets(query, num_results=20)

    print(f"\nTop matches for: {query}")
    for idx, result in enumerate(results, 1):
        print(f"{idx}. {result['name']} ({result['score']:.2f})")
        print(
            f"   - {result['outcomes'][0]['outcome']} ({result['outcomes'][0]['price']}) vs {result['outcomes'][1]['outcome']} ({result['outcomes'][1]['price']})"
        )
        print()

    with open("results.json", "w") as f:
        json.dump(results, f, indent=2)
