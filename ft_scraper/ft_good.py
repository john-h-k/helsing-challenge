import uuid
import time
import requests
from bs4 import BeautifulSoup

# from datetime import datetime
import logging
import json
import os
import random


class FTScraper:
    def __init__(self):
        self.base_url = "https://www.ft.com"
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/91.0.4472.124 Safari/537.36"
            )
        }
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def get_articles(self, section="", page=0):
        """
        Scrape headlines from FT's homepage or specified section
        Returns a list of dictionaries containing article information
        """
        try:
            if page:
                section = f"{section}?page={page}"
            url = f"{self.base_url}/{section}"
            print(url)
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            articles = []

            headlines = soup.find_all("a", {"data-trackable": "heading-link"})

            for headline in headlines:
                try:
                    title = headline.get_text().strip()
                    link = headline.get("href")
                    if link and not link.startswith("http"):
                        link = self.base_url + link

                    # Get timestamp if available (might be in a nearby element)
                    timestamp_elem = headline.find_parent().find_parent().find("time")
                    pub_date = (
                        timestamp_elem.get("datetime") if timestamp_elem else None
                    )

                    if title:
                        articles.append(
                            {
                                "title": title,
                                "url": link,
                                # "published_date": pub_date,
                                "source": "Financial Times",
                                "section": section,
                            }
                        )
                except Exception as e:
                    self.logger.error(f"Error parsing headline: {str(e)}")
                    continue

            self.logger.info(f"Found {len(articles)} articles")
            return articles

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error fetching FT content: {str(e)}")
            return []

    def get_article_content(self, url, from_tag):
        time.sleep(0.03)
        try:
            cookies = {
                "FTSession_s": (
                    "07UWyfoqUkLS053PUfVlHvcl0wAAAZHrq5hlw8I.MEQCID8uRj61TJAX6rEYngYcbrTJknTgJ4reARviUd0xJCSLAiBLNJ7u3Po3iFh_-Nn1E20dUH4I222SFhzJnEfR5OzL4w"
                )
            }

            self.headers.update(
                {
                    "User-Agent": (
                        "Mozilla/4.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/91.1.4472.124 Safari/537.37"
                    )
                }
            )

            response = requests.get(url, headers=self.headers, cookies=cookies)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Find the JSON-LD script tag that contains the article content
            script_tag = soup.find("script", {"type": "application/ld+json"})
            if script_tag and "articleBody" in script_tag.string:

                article_data = json.loads(script_tag.string)

                article_info = {
                    "uuid4": str(uuid.uuid4()),
                    "title": article_data.get("headline"),
                    "description": article_data.get("description"),
                    "author": (
                        article_data.get("author", [{}])[0].get("name")
                        if article_data["author"]
                        else "John Doe"
                    ),
                    "published_date": article_data.get("datePublished"),
                    # 'modified_date': article_data.get('dateModified'),
                    "content": article_data.get("articleBody"),
                    # 'word_count': article_data.get('wordCount'),
                    "tag": from_tag,
                    "url": url,
                    # "main_image_url": article_data.get("image", {}).get("url"),
                }
                # print(article_info)

                return article_info
            else:
                self.logger.error("Could not find article content. Might need auth.")
                return None

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error fetching article content: {str(e)}")
            return None


if __name__ == "__main__":
    scraper = FTScraper()

    # sections_to_scrape = ["world", "world-uk", "companies", "technology", "markets", "climate-capital", "opinion", "lex"]
    RANGE = range(1, 10)
    sections_to_scrape = ["world-uk", "us", "china", "singapore", "india"]
    articles = []
    for i in RANGE:
        articles.extend(
            [
                article
                for section in sections_to_scrape
                for article in scraper.get_articles(section, page=i)
            ]
        )

    # print(articles)
    # articles = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "older_articles.json")))

    article_contents = []
    seen = set()
    for article in articles:
        if not article:
            print("BAD ARTICLE")
            continue
        if article["url"] not in seen:
            seen.add(article["url"])
            content = scraper.get_article_content(
                article["url"], from_tag=article["section"]
            )
            if content:
                article_contents.append(content)
        else:
            print("duplicate", end=" ")
        if len(seen) % 30 == 0:
            print(f"\nLEN {len(seen)}")

    # article_contents = [
    #     scraper.get_article_content_with_img(article["url"]) for article in articles
    # ]

    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")

    # Create the directory if it doesn't exist
    os.makedirs(out_dir, exist_ok=True)

    file_path = os.path.join(out_dir, "ft_articles_BIG.json")

    with open(file_path, "w") as f:
        json.dump(article_contents, f)
