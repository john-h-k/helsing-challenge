import uuid
import time
import requests
from bs4 import BeautifulSoup

# from datetime import datetime
import logging
import json
import os
import random

COUNTRY_CODES = {
    "world-uk": "UK",
    "us": "US",
    "india": "IN",
    "united-arab-emirates": "AE",
    "china": "CN",
    "singapore": "SG",
    "brazil": "BR",
}


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
        if random.randint(1, 5) <= 3:
            time.sleep(2.5)
        else:
            time.sleep(0.5)
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
        time.sleep(0.06)
        try:
            cookies = {
                "FTSession_s": (
                    "07UWyfoqUkLS053PUfVlHvcl0wAAAZTE6cDOw8I.MEUCIQCHLY_V8TNnjflk9J-mRnVw7PgjVTYbwuj2PcYzbdp1dgIgXTcZS4FnORJvVCD3nYBpbBmIBPygwVTN2Ol_MsfdHMs"
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
                    "id": str(uuid.uuid4()),
                    "event_name": article_data.get("headline"),
                    "blurb": article_data.get("description"),
                    # "author": (
                    #     article_data.get("author", [{}])[0].get("name")
                    #     if article_data["author"]
                    #     else "John Doe"
                    # ),
                    "date": article_data.get("datePublished").split("T")[0]
                    + "00:00:00.0",
                    # 'modified_date': article_data.get('dateModified'),
                    "body": article_data.get("articleBody"),
                    # 'word_count': article_data.get('wordCount'),
                    "region_codes": [COUNTRY_CODES[from_tag.split("?")[0]]],
                    # "url": url,
                    # "main_image_url": article_data.get("image", {}).get("url"),
                    "metadata": {"url": url},
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
    sections_to_scrape = [
        "world-uk",
        "us",
        "china",
        "singapore",
        "india",
        "united-arab-emirates",
        "brazil",
    ]
    articles = []
    for i in RANGE:
        articles.extend(
            [
                article
                for section in sections_to_scrape
                for article in scraper.get_articles(section, page=i)
            ]
        )

    # Group articles by country code
    articles_by_country = {}
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
                country_code = content["region_codes"][0]
                if country_code not in articles_by_country:
                    articles_by_country[country_code] = []
                articles_by_country[country_code].append(content)
        else:
            print("duplicate", end=" ")
        if len(seen) % 50 == 0:
            print(f"\nLEN {len(seen)}")

    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
    os.makedirs(out_dir, exist_ok=True)

    # Save separate files for each country
    for country_code, country_articles in articles_by_country.items():
        file_path = os.path.join(out_dir, f"ft_{country_code}.json")
        with open(file_path, "w") as f:
            json.dump(country_articles, f)
