import time
import requests
from bs4 import BeautifulSoup

from typing import Optional, List, Tuple
import logging
import json
import os
from dotenv import load_dotenv

from abstract_scraper import Scraper, ArticleMetadata, Article

load_dotenv()


class FTScraper(Scraper):
    """
    A web scraper for extracting articles and content from the Financial Times website.
    """

    def __init__(self):
        self.base_url = "https://www.ft.com"
        self.search_url = "https://www.ft.com/search?q="
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            ),
            "accept": "*/*",
        }
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        self.index = 0

    def get_articles(self, search_term: str = "") -> List[ArticleMetadata]:
        """
        Scrapes article metadata (title, URL, date) from a given FT section.
        """
        try:
            section = self._get_search_term_page(search_term)
            url = f"{self.base_url}{section}"
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
                            ArticleMetadata(
                                title=title,
                                url=link,
                                # published_date=pub_date,
                                source="Financial Times",
                            )
                        )
                except Exception as e:
                    self.logger.error(f"Error parsing headline: {str(e)}")
                    continue

            self.logger.info(f"Found {len(articles)} articles")
            return articles

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error fetching FT content: {str(e)}")
            return []

    def get_article_data(
        self, url: str, country_code: Optional[str] = None
    ) -> Optional[Article]:
        """
        Extracts detailed information from an article URL, including content and metadata.
        """

        try:
            cookies = {
                "FTSession_s": "08oGukEMk0U805RkEMv48soW0wAAAZTDjEVww8I.MEYCIQDiZxwxZ88i3cA0FqrorMapgjMv-xDB2Wghz-LQHrtdLQIhAIo8G2ahCySQuZtQxMO3ODrKbvdcnQbKuiXbFRNZ5kAK"
            }

            response = requests.get(url, headers=self.headers, cookies=cookies)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            script_tag = soup.find("script", {"type": "application/ld+json"})
            if script_tag and "articleBody" in script_tag.string:
                article_data = json.loads(script_tag.string)
                self.index += 1

                article_info = Article(
                    uuid=self.index,
                    event_name=article_data.get("headline"),
                    blurb=article_data.get("description"),
                    body=article_data.get("articleBody"),
                    date=article_data.get("datePublished"),
                    region_codes=country_code if country_code else "NA",
                    metadata="",
                )

                return article_info
            else:
                self.logger.error("Could not find article content. Might need auth.")
                return None

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error fetching article content: {str(e)}")
            return None

    def _get_search_term_page(self, search_term: str) -> Optional[str]:
        """
        Searches FT for a search_term's section and returns its URL endpoint.
        """

        try:
            space_encoded = search_term.replace(" ", "%20")
            search_url = f"{self.search_url}{space_encoded}"
            response = requests.get(search_url)

            soup = BeautifulSoup(response.text, "html.parser")
            related = soup.find("ul", attrs={"class": "link-list"})
            top_link = related.find("li").find("a")
            endpoint = top_link["href"]
            return endpoint

        except Exception as e:
            self.logger.error(
                f"Can't get search_term page: {str(e)}"
            )  # TODO: fallback to some sane default


def ingest_ft_db(search_terms: List[str], starting_index: int) -> List[dict]:
    """Reads the previously scraped FT articles and filters them by search terms.

    Args:
        search_terms (List[str]): terms to filter the articles by
        starting_index (int): the index to start from

    Returns:
        Tuple[List[dict], int]: a list of articles and the number of articles
    """
    # read in ft.json
    with open("ft.json", "r") as f:
        articles = json.load(f)

    formatted_articles = []
    index = starting_index

    for article in articles:
        if article is None:
            continue

        # get title, description, and published_date
        title = article.get("title", None)
        description = article.get("description", None)
        published_date = article.get("published_date", None)

        if title is None or description is None or published_date is None:
            continue

        # get the body of the article, and stitch it together
        body_sections = article.get("content", None)
        if body_sections is None:
            continue

        body = ""
        for section in body_sections:
            if section["type"] == "text":
                body += "\n" + section["content"]

        # search for search_terms in the and body
        # split body and title into words
        body_words = body.lower().split()
        title_words = title.lower().split()

        # filter
        if any(term in body_words for term in search_terms) or any(
            term in title_words for term in search_terms
        ):
            # iterate and add the article to formatted_articles
            index += 1
            formatted_articles.append(
                {
                    "uuid": index,
                    "event_name": title,
                    "blurb": description,
                    "region_codes": "NA",
                    "body": body,
                    "date": published_date[:10],
                    "metadata": "",
                }
            )

    return formatted_articles


def fetch_ft_articles(country: str, industry: str, search_terms: List[str]) -> None:
    """
    Wrapper function to fetch articles from FT using both live and historical data
    Saves the results to a JSON

    Args:
        country (str): the exact country url you're searching for (e.g: china)
        industry (str): the exact industry url you're searching for (e.g: commodities)
        search_terms (List[str]): list of terms to filter the larger historical database by
    """
    country_codes = {
        "china": "cn",
        "us": "us",
        "uk": "uk",
        "germany": "de",
        "france": "fr",
        "japan": "jp",
        "india": "in",
    }

    scraper = FTScraper()

    # are chronological
    articles = scraper.get_articles(search_term=country)
    articles.extend(scraper.get_articles(search_term=industry))

    article_contents = []
    seen = set()
    for article in articles:
        time.sleep(0.5)
        if article and article.url not in seen:
            seen.add(article.url)
            content = scraper.get_article_data(
                article.url, country_code=country_codes[country]
            )
            if content:
                article_contents.append(content.model_dump())
        else:
            scraper.logger.info("skipping duplicate")

    article_contents.extend(ingest_ft_db(search_terms, len(article_contents)))

    outfile = f"{country}_{industry}_ft.json"

    with open(outfile, "w") as f:
        json.dump(article_contents, f, indent=2)


if __name__ == "__main__":
    search_terms = [
        "china",
        "commodities",
        "metals",
        "mining",
        "energy",
        "oil",
        "coal",
        "iron",
        "steel",
    ]

    fetch_ft_articles("china", "commodities", search_terms=search_terms)
    # scr = FTScraper()
    # res = scr.get_article_data(
    #     "https://www.ft.com/content/94af18db-0ae4-46f8-acc8-7107445d451b"
    # )
    # print(res)
